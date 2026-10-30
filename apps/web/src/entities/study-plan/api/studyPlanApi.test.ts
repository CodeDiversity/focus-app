import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { previewStudyPlan, saveStudyPlan, listStudyPlan } from './studyPlanApi';

const originalAdapter = httpClient.defaults.adapter;

function ok(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, status, statusText: 'OK', headers: {} };
}

function failure(config: InternalAxiosRequestConfig, status: number, body: unknown): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: body,
    status,
    statusText: 'Error',
    headers: {},
  } as AxiosResponse);
}

const preview = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'America/New_York',
  generatedAt: '2026-10-30T12:00:00.000Z',
  preferences: {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 240,
  },
  days: [
    {
      date: '2026-10-30',
      targetMinutes: 60,
      sessions: [
        {
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
        },
      ],
    },
  ],
  warnings: [],
  deferred: [],
};

const saved = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'America/New_York',
  days: [
    {
      date: '2026-10-30',
      targetMinutes: 60,
      sessions: [
        {
          id: 's-1',
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          status: 'SCHEDULED',
        },
      ],
    },
  ],
};

describe('studyPlanApi.previewStudyPlan', () => {
  beforeEach(() => tokenStore.clearToken());
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('POSTs /study-plans/preview and returns the proposal', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return ok(config, preview, 200);
    };
    await expect(previewStudyPlan()).resolves.toEqual(preview);
    expect(seen?.url).toBe('/study-plans/preview');
    expect(seen?.method).toBe('post');
  });
});

describe('studyPlanApi.saveStudyPlan', () => {
  beforeEach(() => tokenStore.clearToken());
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('POSTs /study-plans with { from, to, sessions } and returns the saved plan', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return ok(config, saved, 201);
    };
    const sessions = [
      { assignmentId: 'a-1', date: '2026-10-30', startTime: '09:00', endTime: '10:00' },
    ];
    await expect(saveStudyPlan('2026-10-30', '2026-11-05', sessions)).resolves.toEqual(saved);
    expect(seen?.url).toBe('/study-plans');
    expect(seen?.method).toBe('post');
    expect(JSON.parse(seen!.data as string)).toEqual({
      from: '2026-10-30',
      to: '2026-11-05',
      sessions,
    });
  });

  it('preserves a 409 conflict body', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'The plan conflicts with your calendar.',
        error: 'Conflict',
        conflicts: [
          { sessionIndex: 0, date: '2026-10-30', startTime: '09:00', reason: 'OVERLAPS_CLASS' },
        ],
      });
    };
    await expect(saveStudyPlan('2026-10-30', '2026-11-05', [])).rejects.toMatchObject({
      response: { data: { statusCode: 409, conflicts: [{ reason: 'OVERLAPS_CLASS' }] } },
    });
  });

  it('preserves a 409 WINDOW_ROLLED_OVER body', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'The plan week has rolled over — generate a new proposal to save it.',
        error: 'WINDOW_ROLLED_OVER',
      });
    };
    await expect(saveStudyPlan('2026-10-30', '2026-11-05', [])).rejects.toMatchObject({
      response: { data: { statusCode: 409, error: 'WINDOW_ROLLED_OVER' } },
    });
  });
});

describe('studyPlanApi.listStudyPlan', () => {
  beforeEach(() => tokenStore.clearToken());
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /study-plans with no query parameters', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return ok(config, saved, 200);
    };
    await expect(listStudyPlan()).resolves.toEqual(saved);
    expect(seen?.url).toBe('/study-plans');
    expect(seen?.method).toBe('get');
    expect(seen?.params).toBeUndefined();
  });
});
