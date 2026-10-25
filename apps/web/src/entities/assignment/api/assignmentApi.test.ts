import { afterEach, describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { createAssignment, deleteAssignment, updateAssignment } from './assignmentApi';

const originalAdapter = httpClient.defaults.adapter;
const assignment = {
  id: 'assignment-1',
  title: 'Problem Set 4',
  description: null,
  dueDate: null,
  estimatedHours: null,
  actualHours: null,
  status: 'PENDING',
  priority: 'MEDIUM',
  createdAt: '2026-10-24T12:00:00.000Z',
  updatedAt: '2026-10-24T12:00:00.000Z',
};
afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
});

describe('createAssignment', () => {
  it('posts the supplied fields to /assignments and returns the 10-key projection', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return { config, data: assignment, status: 201, statusText: 'Created', headers: {} };
    };
    const body = {
      title: 'Problem Set 4',
      courseId: 'course-1',
      dueDate: '2026-10-12T07:00:00.000Z',
      estimatedHours: 2.5,
      priority: 'HIGH' as const,
      description: 'Read chapter 4',
    };
    await expect(createAssignment(body)).resolves.toEqual(assignment);
    expect(seen?.url).toBe('/assignments');
    expect(seen?.method).toBe('post');
    expect(JSON.parse(seen!.data as string)).toEqual(body);
    expect(Object.keys(assignment)).toHaveLength(10);
  });

  it.each([undefined, null, ''])(
    'omits blank optional strings (%s) and null duration',
    async (blank) => {
      let body: unknown;
      httpClient.defaults.adapter = async (config) => {
        body = JSON.parse(config.data as string);
        return { config, data: assignment, status: 201, statusText: 'Created', headers: {} };
      };
      await createAssignment({
        title: 'Problem Set 4',
        courseId: blank,
        dueDate: blank,
        description: blank,
        estimatedHours: null,
      });
      expect(body).toEqual({ title: 'Problem Set 4' });
    }
  );
});

describe('updateAssignment', () => {
  it('calls PATCH /assignments/:id with payload and returns updated assignment', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    const updatedAssignment = { ...assignment, title: 'Updated Title' };
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return { config, data: updatedAssignment, status: 200, statusText: 'OK', headers: {} };
    };
    const payload = {
      title: 'Updated Title',
      dueDate: '2026-10-31T23:59:59.000Z',
      estimatedHours: 4,
      priority: 'HIGH' as const,
      description: 'Updated description',
    };
    const result = await updateAssignment('assignment-1', payload);
    expect(result).toEqual(updatedAssignment);
    expect(seen?.url).toBe('/assignments/assignment-1');
    expect(seen?.method).toBe('patch');
    expect(JSON.parse(seen!.data as string)).toEqual(payload);
  });
});

describe('deleteAssignment', () => {
  it('calls DELETE /assignments/:id and resolves void', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return { config, data: undefined, status: 204, statusText: 'No Content', headers: {} };
    };
    await expect(deleteAssignment('assignment-1')).resolves.toBeUndefined();
    expect(seen?.url).toBe('/assignments/assignment-1');
    expect(seen?.method).toBe('delete');
  });
});
