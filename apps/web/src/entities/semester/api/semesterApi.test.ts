import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import {
  createSemester,
  deleteSemester,
  getSemester,
  listSemesters,
  updateSemester,
} from './semesterApi';

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

/** The 200 body `GET /semesters` returns (SP-110A; the 8-key contract shape). */
const countedSemester = { ...createdSemester, courseCount: 4 };

describe('semesterApi.listSemesters (SP-110A contract)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /semesters and maps the 200 body to SemesterWithCount[] (dates stay yyyy-MM-dd)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, [countedSemester], 200);
    };

    const result = await listSemesters();

    expect(seenConfig?.url).toBe('/semesters');
    expect(seenConfig?.method).toBe('get');
    // The API order (startDate desc, then name asc) is preserved as-is — the
    // list renders it without a client re-sort.
    expect(result).toEqual([countedSemester]);
  });
});

describe('semesterApi.getSemester (SP-110A contract)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /semesters/:id and maps the 200 body to SemesterWithCount', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, countedSemester, 200);
    };

    await expect(getSemester('sem-1')).resolves.toEqual(countedSemester);
    expect(seenConfig?.url).toBe('/semesters/sem-1');
    expect(seenConfig?.method).toBe('get');
  });

  it('rejects the uniform 404 (missing OR foreign id — no existence oracle)', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(getSemester('someone-elses-semester')).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404 } },
    });
  });
});

describe('semesterApi.updateSemester (SP-110A contract, D110-5)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('PATCHes the partial body as-is to /semesters/:id (yyyy-MM-dd strings, no instant conversion)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, { ...countedSemester, isActive: true, courseCount: 4 }, 200);
    };

    const result = await updateSemester('sem-1', {
      name: 'Fall 2026 (updated)',
      startDate: '2026-09-01',
      endDate: '2026-12-20',
      isActive: true,
    });

    expect(seenConfig?.url).toBe('/semesters/sem-1');
    expect(seenConfig?.method).toBe('patch');
    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      name: 'Fall 2026 (updated)',
      startDate: '2026-09-01',
      endDate: '2026-12-20',
      isActive: true,
    });
    // The response re-derives the single-active state (D110-1).
    expect(result).toMatchObject({ id: 'sem-1', isActive: true, courseCount: 4 });
  });

  it('rejects a field-level 400 on the merged values with the `errors` map preserved', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['endDate must be after startDate'],
        error: 'Bad Request',
        errors: { endDate: ['endDate must be after startDate'] },
      });
    };

    await expect(updateSemester('sem-1', { endDate: '2026-08-01' })).rejects.toMatchObject({
      response: {
        data: { statusCode: 400, errors: { endDate: ['endDate must be after startDate'] } },
      },
    });
  });

  it('rejects a duplicate-name 409 with the sanitized interceptor shape', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'A semester with this name already exists.',
        error: 'Conflict',
      });
    };

    await expect(updateSemester('sem-1', { name: 'Spring 2026' })).rejects.toMatchObject({
      message: 'A semester with this name already exists.',
      response: { data: { statusCode: 409 } },
    });
  });

  it('rejects the uniform 404 (missing OR foreign id)', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(updateSemester('missing-id', { name: 'X' })).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404 } },
    });
  });
});

describe('semesterApi.deleteSemester (SP-110A contract, D110-2)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('DELETEs /semesters/:id and resolves on the 204 (empty body)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, '', 204);
    };

    await expect(deleteSemester('sem-1')).resolves.toBeUndefined();
    expect(seenConfig?.url).toBe('/semesters/sem-1');
    expect(seenConfig?.method).toBe('delete');
  });

  it('rejects the uniform 404 (missing OR foreign id)', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(deleteSemester('someone-elses-semester')).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404 } },
    });
  });
});
