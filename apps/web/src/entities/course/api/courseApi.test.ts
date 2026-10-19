import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { createCourse } from './courseApi';

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

/** The 201 body `POST /courses` returns (SP-107B; the frontend `Course` shape). */
const createdCourse = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: null,
  color: '#6366f1',
  credits: null,
  isActive: true,
  createdAt: '2026-10-18T12:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
};

const request = { code: 'CS101', name: 'Intro to Computer Science', semesterId: 'sem-1' };

describe('courseApi.createCourse', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('POSTs { code, name, semesterId } to /courses when a semester is attached', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, createdCourse);
    };

    await createCourse(request);

    expect(seenConfig?.url).toBe('/courses');
    expect(seenConfig?.method).toBe('post');
    // The serialized body is the contract: only the provided fields, no
    // description/credits/color inputs (EP02 owns those).
    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      code: 'CS101',
      name: 'Intro to Computer Science',
      semesterId: 'sem-1',
    });
  });

  it('omits semesterId from the body when it is null (the D107-8 edge: the course is created without a semester)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, createdCourse);
    };

    await createCourse({ ...request, semesterId: null });

    const body = JSON.parse(seenConfig!.data as string) as Record<string, unknown>;
    expect(body).toEqual({ code: 'CS101', name: 'Intro to Computer Science' });
    expect(body).not.toHaveProperty('semesterId');
  });

  it('maps the 201 body to the Course shape', async () => {
    httpClient.defaults.adapter = async (config) => ok(config, createdCourse);

    await expect(createCourse(request)).resolves.toEqual(createdCourse);
  });

  it('rejects a duplicate-code 409 with the sanitized interceptor shape the wizard relies on', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'A course with this code already exists.',
        error: 'Conflict',
      });
    };

    await expect(createCourse(request)).rejects.toMatchObject({
      message: 'A course with this code already exists.',
      response: { data: { statusCode: 409 } },
    });
  });

  it('rejects a missing/foreign semesterId with the uniform 404 the wizard offers a recovery for', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(createCourse(request)).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404, message: 'Resource not found' } },
    });
  });

  it('rejects a field-level 400 with the `errors` map preserved on the response body', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['code must be 20 characters or fewer'],
        error: 'Bad Request',
        errors: { code: ['code must be 20 characters or fewer'] },
      });
    };

    await expect(createCourse(request)).rejects.toMatchObject({
      response: {
        data: { statusCode: 400, errors: { code: ['code must be 20 characters or fewer'] } },
      },
    });
  });
});
