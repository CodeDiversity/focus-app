/**
 * SP-105C (C13) — the shared link-token reader for the URL fragment.
 *
 * The 43-character base64url representation (SD3/SD4) is security-relevant
 * and must not drift between the verification and reset screens, so the
 * pattern lives here rather than in each page.
 */
const LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function readLinkToken(hash: string): string | null {
  const token = new URLSearchParams(hash.slice(1)).get('token');
  return token && LINK_TOKEN_PATTERN.test(token) ? token : null;
}
