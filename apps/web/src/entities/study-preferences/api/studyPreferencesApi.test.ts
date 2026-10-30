import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { getStudyPreferences, putStudyPreferences } from './studyPreferencesApi';
import type { StudyPreferences } from '@/entities/study-preferences/model/types';

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

const stored: StudyPreferences = {
  sessionLengthMinutes: 45,
  minSessionMinutes: 10,
  maxSessionMinutes: 90,
  dailyCapMinutes: 180,
};

const defaults: StudyPreferences = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
};

describe('studyPreferencesApi.getStudyPreferences', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /study-preferences and returns the effective values', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, stored, 200);
    };

    await expect(getStudyPreferences()).resolves.toEqual(stored);
    expect(seenConfig?.url).toBe('/study-preferences');
    expect(seenConfig?.method).toBe('get');
  });

  it('returns the documented defaults when the student has never set them', async () => {
    httpClient.defaults.adapter = async (config) => ok(config, defaults, 200);
    await expect(getStudyPreferences()).resolves.toEqual(defaults);
  });
});

describe('studyPreferencesApi.putStudyPreferences', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('PUTs /study-preferences with the partial body and returns the effective set', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, stored, 200);
    };

    const payload = { sessionLengthMinutes: 45 };
    await expect(putStudyPreferences(payload)).resolves.toEqual(stored);
    expect(seenConfig?.url).toBe('/study-preferences');
    expect(seenConfig?.method).toBe('put');
    expect(JSON.parse(seenConfig!.data as string)).toEqual(payload);
  });

  it('sends the four values when all are provided', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, stored, 200);
    };

    await putStudyPreferences(stored);
    expect(JSON.parse(seenConfig!.data as string)).toEqual(stored);
  });

  it('rejects an invalid value with the field-level 400 `errors` map preserved', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['sessionLengthMinutes must be an integer between 5 and 480'],
        error: 'Bad Request',
        errors: {
          sessionLengthMinutes: ['sessionLengthMinutes must be an integer between 5 and 480'],
        },
      });
    };

    await expect(putStudyPreferences({ sessionLengthMinutes: 600 })).rejects.toMatchObject({
      response: {
        data: {
          statusCode: 400,
          errors: {
            sessionLengthMinutes: ['sessionLengthMinutes must be an integer between 5 and 480'],
          },
        },
      },
    });
  });

  it('rejects a broken cross-field combination with the field-level 400 `errors` map', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['minSessionMinutes must be <= sessionLengthMinutes'],
        error: 'Bad Request',
        errors: { minSessionMinutes: ['minSessionMinutes must be <= sessionLengthMinutes'] },
      });
    };

    await expect(putStudyPreferences({ minSessionMinutes: 100 })).rejects.toMatchObject({
      response: {
        data: {
          statusCode: 400,
          errors: { minSessionMinutes: ['minSessionMinutes must be <= sessionLengthMinutes'] },
        },
      },
    });
  });

  it('rejects an unauthenticated request with the uniform 401', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 401, {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });
    };

    await expect(getStudyPreferences()).rejects.toMatchObject({
      response: { data: { statusCode: 401 } },
    });
  });
});
