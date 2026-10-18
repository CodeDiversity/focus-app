/**
 * SP-105G — shared recovery-session boundary for the web client.
 *
 * This is a leaf module: it imports only `@/features/auth/model/types` (type) and `./tokenStore`,
 * so `api.ts` and `AuthContext.tsx` consume it without an import cycle
 * (ticket decision R4). The api module registers its single-flight refresh
 * here via `setInFlightRefresh`; SP-105C supplies the reset request itself to
 * `runRecoveryReset`.
 *
 * Session semantics (parent contract, "Session semantics and ordering"):
 * - Before a reset POST, the boundary drains the in-flight single-flight
 *   refresh under a 10-second bound and defers new automatic refreshes until
 *   release. Draining (rather than aborting) guarantees the refresh's
 *   Set-Cookie lands before the reset response's cookie expiry.
 * - On reset success the shared session generation advances *before* the
 *   local token/user are cleared. Every local state-mutation path snapshots
 *   the generation at request/flight start and becomes a no-op if a
 *   successful reset advanced it: the refresh token write, queued
 *   interceptor retries, the session-expired failure callback, the
 *   AuthContext boot restore and profile flights.
 * - On reset failure the generation is unchanged: the prior session is
 *   preserved subject to ordinary expired-session behavior.
 * - All recovery failures are sanitized into `RecoveryError`; the raw Axios
 *   error, its config, the request body (which carries the raw link token)
 *   and response headers never propagate.
 * - This module owns local state and request ordering only. The HttpOnly
 *   refresh cookie is expired server-side by SP-105B; navigation is C's.
 */
import type { AuthResponse } from '@/features/auth/model/types';
import { tokenStore } from './tokenStore';

/** `POST /auth/reset-password` success payload (SP-105B). */
export interface ResetPasswordResult {
  message: string;
}

/* ---------------------------- shared session generation --------------------- */

let sessionGeneration = 0;

/** Snapshot point for every local state-mutation path (request/flight start). */
export function snapshotSessionGeneration(): number {
  return sessionGeneration;
}

/**
 * Advances the shared generation. A successful password reset calls this
 * before clearing local token/user, so any completion that predates the
 * reset observes an advanced generation and performs no state mutation.
 */
export function advanceSessionGeneration(): number {
  sessionGeneration += 1;
  return sessionGeneration;
}

/**
 * Registered by AuthContext: clears the local `user` when a reset succeeds.
 * Navigation to /login is C's job, not this callback's — the session-expired
 * handler is a different, generation-guarded path.
 */
let localSessionClearer: (() => void) | null = null;

export function registerLocalSessionClearer(clearer: (() => void) | null): void {
  localSessionClearer = clearer;
}

/* ----------------------------- in-flight refresh ---------------------------- */

let inFlightRefresh: Promise<AuthResponse> | null = null;

/**
 * Called by the api module's single-flight refresh as it starts and settles.
 * A `null` registration is the "settled" signal the drain barrier watches.
 */
export function setInFlightRefresh(promise: Promise<AuthResponse> | null): void {
  inFlightRefresh = promise;
  if (promise === null && barrierPhase === 'awaiting-drain') {
    releaseBarrier();
  }
}

export function getInFlightRefresh(): Promise<AuthResponse> | null {
  return inFlightRefresh;
}

/* --------------------------------- barrier ---------------------------------- */

type BarrierPhase = 'idle' | 'active' | 'awaiting-drain';

let barrierPhase: BarrierPhase = 'idle';

const barrierReleaseWaiters = new Set<() => void>();

/** True while any recovery operation is holding the barrier. */
export function isRecoveryBarrierActive(): boolean {
  return barrierPhase !== 'idle';
}

/**
 * Resolves when the barrier releases. Used by `refreshAccessToken` to defer
 * (never drop) rotations requested while a recovery operation is active.
 */
export function onRecoveryBarrierReleased(): Promise<void> {
  if (barrierPhase === 'idle') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    barrierReleaseWaiters.add(resolve);
  });
}

function activateBarrier(): void {
  barrierPhase = 'active';
}

function releaseBarrier(): void {
  if (barrierPhase === 'idle') {
    return;
  }
  barrierPhase = 'idle';
  const waiters = [...barrierReleaseWaiters];
  barrierReleaseWaiters.clear();
  for (const wait of waiters) {
    wait();
  }
}

/**
 * After the 10-second drain bound expires without the in-flight refresh
 * settling, keep the barrier held: a still-pending refresh may deliver its
 * Set-Cookie at any moment, so no further reset may be dispatched until it
 * actually settles (`setInFlightRefresh(null)` releases).
 */
function holdBarrierForDrain(): void {
  barrierPhase = 'awaiting-drain';
}

/* ------------------------------- sanitizing --------------------------------- */

export interface RecoveryError {
  /** Response status, or 0 for a network failure with no response. */
  status: number;
  /** Actionable message from the global error envelope (or a safe fallback). */
  message: string;
  /** Field errors from the envelope `error` field when it is a field map. */
  fieldErrors?: Record<string, string[]>;
  /** 429 only: decimal integer 1–60 from `Retry-After`, else the 60s fallback. */
  retryAfterSeconds?: number;
  /** 429/5xx/network are retryable; 400/401/404 are not. */
  retryable: boolean;
}

export function isRecoveryError(value: unknown): value is RecoveryError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<RecoveryError>;
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.message === 'string' &&
    typeof candidate.retryable === 'boolean'
  );
}

/** 429 countdown fallback when `Retry-After` is absent/malformed/out of range. */
const FALLBACK_RETRY_AFTER_SECONDS = 60;

/**
 * `Retry-After` is accepted only as a decimal integer in 1–60 (the shared
 * retry wire contract, PR-001). Absent/malformed/out-of-range yields
 * undefined so the caller applies the 60-second fallback.
 */
function parseRetryAfterSeconds(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 60 ? value : undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const text = value.trim();
  if (!/^\d+$/.test(text)) {
    return undefined;
  }
  const seconds = Number(text);
  return seconds >= 1 && seconds <= 60 ? seconds : undefined;
}

interface ErrorEnvelope {
  statusCode?: number;
  message?: string | string[];
  error?: unknown;
}

/** Header lookup tolerant of AxiosHeaders instances and case differences. */
function readHeader(headers: unknown, name: string): unknown {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  const record = headers as Record<string, unknown> & { get?: (key: string) => unknown };
  const keys = [name, name.toLowerCase(), name.toUpperCase()];
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return typeof record.get === 'function' ? record.get(name) : undefined;
}

/** Field errors from the envelope `error` field when it is a field map. */
function extractFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(record)) {
    if (Array.isArray(messages)) {
      const strings = messages.map(String);
      if (strings.length) {
        fieldErrors[field] = strings;
      }
    } else if (typeof messages === 'string' && messages) {
      fieldErrors[field] = [messages];
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

/**
 * Collapses the envelope `message` into one actionable string. A
 * class-validator 400 carries one entry per failed constraint — and token
 * failures repeat the same uniform invalid-link message per constraint — so
 * entries are deduped (order-preserving) and joined. Dedup keeps the uniform
 * message byte-identical for SP-105C's clear-on-invalid-link check.
 */
function envelopeMessage(envelope: ErrorEnvelope | undefined): string | undefined {
  const message = envelope?.message;
  if (typeof message === 'string' && message) {
    return message;
  }
  if (Array.isArray(message)) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const entry of message) {
      const text = String(entry).trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        unique.push(text);
      }
    }
    if (unique.length) {
      return unique.join('. ');
    }
  }
  return undefined;
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 429:
      return 'Too many recovery requests. Wait a moment, then try again.';
    case 503:
      return 'Password recovery is temporarily unavailable. Please wait a moment and try again.';
    case 400:
      return 'That request was not valid. Check your input and try again.';
    case 401:
    case 403:
    case 404:
      return 'That request could not be completed. Please try again.';
    case 0:
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Sanitizes any recovery-endpoint failure into the UI-safe `RecoveryError`
 * shape. The input may be a raw Axios error (response + config), a spread
 * rejection from the api interceptor, or an already-sanitized value (which
 * passes through unchanged).
 *
 * Nothing about the request is propagated: the reset body carries the raw
 * link token, and response headers (including the expired-cookie Set-Cookie)
 * are never exposed beyond the derived `retryAfterSeconds`.
 */
export function sanitizeRecoveryError(error: unknown): RecoveryError {
  if (isRecoveryError(error)) {
    return error;
  }

  const carrier = (typeof error === 'object' && error !== null ? error : {}) as {
    response?: { status?: number; data?: unknown; headers?: unknown };
  };
  const status = carrier.response?.status ?? 0;
  const data = carrier.response?.data;
  const envelope = typeof data === 'object' && data !== null ? (data as ErrorEnvelope) : undefined;

  const message = envelopeMessage(envelope) ?? fallbackMessage(status);

  // 429 only carries a countdown: decimal integer 1–60, else 60s (PR-001).
  // Network/503 retries are manual — no countdown (shared retry wire contract).
  const retryAfterSeconds =
    status === 429
      ? (parseRetryAfterSeconds(readHeader(carrier.response?.headers, 'Retry-After')) ??
        FALLBACK_RETRY_AFTER_SECONDS)
      : undefined;

  const retryable = status === 0 || status === 429 || status >= 500;

  const fieldErrors = extractFieldErrors(envelope?.error);
  const result = newRecoveryError(status, message, retryable, retryAfterSeconds);
  if (fieldErrors) {
    result.fieldErrors = fieldErrors;
  }
  return result;
}

function newRecoveryError(
  status: number,
  message: string,
  retryable: boolean,
  retryAfterSeconds?: number
): RecoveryError {
  const error: RecoveryError = { status, message, retryable };
  if (retryAfterSeconds !== undefined) {
    error.retryAfterSeconds = retryAfterSeconds;
  }
  return error;
}

/* ---------------------------- recovery operation ---------------------------- */

/** Bounded wait for the in-flight refresh before a reset POST (ticket AC1). */
export const RECOVERY_DRAIN_TIMEOUT_MS = 10_000;

const DRAIN_TIMEOUT_MESSAGE =
  'Your session is still syncing. Please wait a moment, then try again.';

const RECOVERY_IN_PROGRESS_MESSAGE =
  'A password reset is already in progress. Please wait for it to finish.';

/**
 * Waits for the in-flight single-flight refresh to *settle* (resolve or
 * reject) within the 10-second bound. Aborting the request would not prove
 * its response cookie cannot still arrive, so the wait is for settlement.
 *
 * Rejects with a sanitized retryable `RecoveryError` when the bound expires
 * first; the caller (`runRecoveryReset`) then holds the barrier until the
 * in-flight actually settles.
 */
function drainInFlightRefresh(): Promise<void> {
  const inFlight = getInFlightRefresh();
  if (!inFlight) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(newRecoveryError(409, DRAIN_TIMEOUT_MESSAGE, true));
    }, RECOVERY_DRAIN_TIMEOUT_MS);
    const onSettled = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    inFlight.then(onSettled, onSettled);
  });
}

/**
 * Executes the supplied password-reset request inside the recovery-operation
 * boundary (ticket AC1/AC2):
 *
 * 1. A second overlapping reset operation is rejected with a sanitized
 *    retryable error (status 409) — only one reset at a time.
 * 2. The in-flight single-flight refresh is drained under the 10-second
 *    bound; new automatic refreshes are deferred until release. If the bound
 *    expires first, the reset is NOT sent and a sanitized retryable error is
 *    returned while the barrier stays held until the in-flight settles.
 * 3. On success: the shared session generation advances *before* the local
 *    token/user are cleared, then the barrier releases. Deferred refreshes
 *    run afterwards and are generation-guarded (server-side, their rotation
 *    fails against the revoked session).
 * 4. On failure: the barrier releases, the generation is unchanged and the
 *    prior session is preserved; the failure is sanitized.
 *
 * The `send` callback (SP-105C) performs the actual `POST /auth/reset-password`
 * through the shared api instance. Its body carries the raw link token, so
 * any failure is re-sanitized here — the raw Axios error/config/body/headers
 * never escape this function.
 */
export async function runRecoveryReset(
  send: () => Promise<ResetPasswordResult>
): Promise<ResetPasswordResult> {
  if (isRecoveryBarrierActive()) {
    throw newRecoveryError(409, RECOVERY_IN_PROGRESS_MESSAGE, true);
  }
  activateBarrier();
  let sent = false;
  try {
    await drainInFlightRefresh();
    sent = true;
    const result = await send();
    // Commit the session change: generation first, then the local clears.
    // The barrier serializes resets, so no completion can interleave here.
    advanceSessionGeneration();
    tokenStore.clearToken();
    localSessionClearer?.();
    releaseBarrier();
    return result;
  } catch (error) {
    if (!sent && getInFlightRefresh() !== null) {
      // The drain bound expired and the in-flight refresh has not settled —
      // keep the barrier held until it does; do not dispatch the reset.
      holdBarrierForDrain();
    } else {
      releaseBarrier();
    }
    throw sanitizeRecoveryError(error);
  }
}
