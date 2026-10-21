import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  type CourseWithSemester,
} from './courseApi';

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

/**
 * The 201 body `POST /courses` returns (SP-111A, D111-4: the 13-key
 * `CourseWithSemester` shape — the SP-107B 8 keys plus `instructor`,
 * `semesterId`, and the `semester` projection).
 */
const createdCourse: CourseWithSemester = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: null,
  color: '#6366f1',
  credits: null,
  instructor: null,
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
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
    // description/credits/color/instructor inputs (EP02 owns those).
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

  it('includes the provided optional fields (instructor, description, credits, color) in the body', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, createdCourse);
    };

    await createCourse({
      code: 'CS101',
      name: 'Intro to Computer Science',
      semesterId: null,
      instructor: 'Ada Lovelace',
      description: 'The first programming language.',
      credits: 4,
      color: '#ff0000',
    });

    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      code: 'CS101',
      name: 'Intro to Computer Science',
      instructor: 'Ada Lovelace',
      description: 'The first programming language.',
      credits: 4,
      color: '#ff0000',
    });
  });

  it('omits explicit-null optional fields from the body (the backend applies the schema defaults)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, createdCourse);
    };

    await createCourse({
      code: 'CS101',
      name: 'Intro to Computer Science',
      semesterId: null,
      instructor: null,
      description: null,
      credits: null,
      color: null,
    });

    const body = JSON.parse(seenConfig!.data as string) as Record<string, unknown>;
    expect(body).toEqual({ code: 'CS101', name: 'Intro to Computer Science' });
  });

  it('maps the 201 body to the CourseWithSemester shape (D111-4)', async () => {
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

describe('courseApi.listCourses', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /courses with no query params by default (active courses only, D111-3)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, [createdCourse], 200);
    };

    await listCourses();

    expect(seenConfig?.url).toBe('/courses');
    expect(seenConfig?.method).toBe('get');
    expect(seenConfig?.params).toEqual({});
  });

  it('serializes includeArchived=true and semesterId into the query', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, [createdCourse], 200);
    };

    await listCourses({ semesterId: 'sem-1', includeArchived: true });

    expect(seenConfig?.params).toEqual({ semesterId: 'sem-1', includeArchived: 'true' });
  });

  it('omits includeArchived when it is false (the active-only default)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, [createdCourse], 200);
    };

    await listCourses({ includeArchived: false });

    expect(seenConfig?.params).toEqual({});
  });

  it('returns the 200 body as CourseWithSemester[] (API order — no client re-sort)', async () => {
    const archived: CourseWithSemester = {
      ...createdCourse,
      id: 'course-2',
      code: 'MATH101',
      name: 'Calculus I',
      isActive: false,
      semesterId: null,
      semester: null,
    };
    httpClient.defaults.adapter = async (config) => ok(config, [createdCourse, archived], 200);

    await expect(listCourses({ includeArchived: true })).resolves.toEqual([
      createdCourse,
      archived,
    ]);
  });

  it('rejects a missing/foreign semesterId with the uniform 404 (no existence oracle)', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(listCourses({ semesterId: 'foreign' })).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404, message: 'Resource not found' } },
    });
  });
});

describe('courseApi.getCourse', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /courses/:id and returns the CourseWithSemester (regardless of archive state, D111-3)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const archived: CourseWithSemester = { ...createdCourse, isActive: false };
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, archived, 200);
    };

    await expect(getCourse('course-1')).resolves.toEqual(archived);
    expect(seenConfig?.url).toBe('/courses/course-1');
    expect(seenConfig?.method).toBe('get');
  });

  it('rejects a missing/foreign id with the uniform 404 (no existence oracle)', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(getCourse('course-1')).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404, message: 'Resource not found' } },
    });
  });
});

describe('courseApi.updateCourse', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('PATCHes /courses/:id with the partial body and returns the updated CourseWithSemester', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const updated: CourseWithSemester = { ...createdCourse, instructor: 'Ada Lovelace' };
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, updated, 200);
    };

    await expect(updateCourse('course-1', { instructor: 'Ada Lovelace' })).resolves.toEqual(
      updated
    );
    expect(seenConfig?.url).toBe('/courses/course-1');
    expect(seenConfig?.method).toBe('patch');
    expect(JSON.parse(seenConfig!.data as string)).toEqual({ instructor: 'Ada Lovelace' });
  });

  it('sends the archive/restore flag flip (D111-2)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const archived: CourseWithSemester = { ...createdCourse, isActive: false };
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, archived, 200);
    };

    await updateCourse('course-1', { isActive: false });

    expect(JSON.parse(seenConfig!.data as string)).toEqual({ isActive: false });
    expect(archived.isActive).toBe(false);
  });

  it('rejects a field-level 400 on the merged values with the `errors` map preserved', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['code must not be empty and must be 20 characters or fewer'],
        error: 'Bad Request',
        errors: { code: ['code must not be empty and must be 20 characters or fewer'] },
      });
    };

    await expect(updateCourse('course-1', { code: '   ' })).rejects.toMatchObject({
      response: {
        data: {
          statusCode: 400,
          errors: { code: ['code must not be empty and must be 20 characters or fewer'] },
        },
      },
    });
  });

  it('rejects an empty body with the 400 "at least one field" rule', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: 'At least one field must be provided',
        error: 'Bad Request',
      });
    };

    await expect(updateCourse('course-1', {})).rejects.toMatchObject({
      message: 'At least one field must be provided',
      response: { data: { statusCode: 400 } },
    });
  });

  it('rejects a code collision with the 409', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'A course with this code already exists.',
        error: 'Conflict',
      });
    };

    await expect(updateCourse('course-1', { code: 'CS102' })).rejects.toMatchObject({
      message: 'A course with this code already exists.',
      response: { data: { statusCode: 409 } },
    });
  });

  it('rejects a missing/foreign course (or semesterId) with the uniform 404', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(updateCourse('course-1', { semesterId: 'foreign' })).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404, message: 'Resource not found' } },
    });
  });
});
