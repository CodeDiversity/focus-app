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
  type: null,
  createdAt: '2026-10-24T12:00:00.000Z',
  updatedAt: '2026-10-24T12:00:00.000Z',
};
afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
});

describe('createAssignment', () => {
  it('posts the supplied fields to /assignments and returns the 11-key projection', async () => {
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
    expect(Object.keys(assignment)).toHaveLength(11);
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

  it('sends a selected type and omits the key when unset (SP-115H AC 1, D115-2)', async () => {
    const bodies: unknown[] = [];
    httpClient.defaults.adapter = async (config) => {
      bodies.push(JSON.parse(config.data as string));
      return { config, data: assignment, status: 201, statusText: 'Created', headers: {} };
    };
    await createAssignment({ title: 'Quiz chapter 5', type: 'QUIZ' });
    await createAssignment({ title: 'Untyped work' });
    // Exact-object asserts: a set type is on the wire; an unset type is
    // absent, not an explicit null (the API stores either form as null).
    expect(bodies[0]).toEqual({ title: 'Quiz chapter 5', type: 'QUIZ' });
    expect(bodies[1]).toEqual({ title: 'Untyped work' });
  });
});

describe('updateAssignment', () => {
  it('calls PATCH /assignments/:id with payload and returns updated assignment', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    const updatedAssignment = { ...assignment, title: 'Updated Title', type: 'HOMEWORK' };
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return { config, data: updatedAssignment, status: 200, statusText: 'OK', headers: {} };
    };
    const payload = {
      title: 'Updated Title',
      dueDate: '2026-10-31T23:59:59.000Z',
      estimatedHours: 4,
      priority: 'HIGH' as const,
      type: 'HOMEWORK' as const,
      description: 'Updated description',
    };
    const result = await updateAssignment('assignment-1', payload);
    expect(result).toEqual(updatedAssignment);
    expect(seen?.url).toBe('/assignments/assignment-1');
    expect(seen?.method).toBe('patch');
    expect(JSON.parse(seen!.data as string)).toEqual(payload);
  });

  it('sends a set type and never injects null to clear (SP-115H AC 1, D115-3)', async () => {
    const bodies: unknown[] = [];
    httpClient.defaults.adapter = async (config) => {
      bodies.push(JSON.parse(config.data as string));
      return { config, data: assignment, status: 200, statusText: 'OK', headers: {} };
    };
    await updateAssignment('assignment-1', { type: 'QUIZ' });
    // An unchanged (null-stored) edit sends no type key — keep-on-null is the
    // API's PATCH rule, so the client has no null-clear affordance to send.
    await updateAssignment('assignment-1', { title: 'Same work' });
    expect(bodies[0]).toEqual({ type: 'QUIZ' });
    expect(bodies[1]).toEqual({ title: 'Same work' });
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
