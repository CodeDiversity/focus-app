import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { createSemester } from './semesterApi';

const originalAdapter = httpClient.defaults.adapter;

function ok(config: InternalAxiosRequestConfig, data: unknown, status = 201): AxiosResponse {
  return { config, data, status, statusText: 'Created', headers: {} };
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

/** The 201 body `POST /semesters` returns (SP-107B; dates as `yyyy-MM-dd`). */
const createdSemester = {
  id: 'sem-1',
  name: 'Fall 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-15',
  isActive: false,
  createdAt: '2026-10-18T12:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
};

const request = { name: 'Fall 2026', startDate: '2026-09-01', endDate: '2026-12-15' };

describe('semesterApi.createSemester', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('POSTs the body as-is to /semesters (yyyy-MM-dd strings, no instant/time-zone conversion)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, createdSemester);
    };

    await createSemester(request);

    expect(seenConfig?.url).toBe('/semesters');
    expect(seenConfig?.method).toBe('post');
    // The serialized body is the contract: calendar dates stay `yyyy-MM-dd`
    // strings (D107-7) — no Date objects, no timestamps, no `isActive` input.
    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      name: 'Fall 2026',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
    });
  });

  it('maps the 201 body to the Semester shape (dates stay yyyy-MM-dd)', async () => {
    httpClient.defaults.adapter = async (config) => ok(config, createdSemester);

    await expect(createSemester(request)).resolves.toEqual(createdSemester);
  });

  it('rejects a duplicate-name 409 with the sanitized interceptor shape the wizard relies on', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'A semester with this name already exists.',
        error: 'Conflict',
      });
    };

    await expect(createSemester(request)).rejects.toMatchObject({
      message: 'A semester with this name already exists.',
      response: { data: { statusCode: 409 } },
    });
  });

  it('rejects a field-level 400 with the `errors` map preserved on the response body', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['endDate must be after startDate'],
        error: 'Bad Request',
        errors: { endDate: ['endDate must be after startDate'] },
      });
    };

    await expect(createSemester(request)).rejects.toMatchObject({
      response: {
        data: { statusCode: 400, errors: { endDate: ['endDate must be after startDate'] } },
      },
    });
  });
});
