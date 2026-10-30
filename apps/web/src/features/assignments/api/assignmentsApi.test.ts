import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { renderHook, waitFor } from '@testing-library/react';
import httpClient from '@/shared/api/httpClient';
import type { AssignmentListItem } from '@/shared/types/academic';
import { assignmentsApi } from './assignmentsApi';

const payload: AssignmentListItem[] = [
  {
    id: 'a1',
    title: 'Problem set 3',
    description: null,
    dueDate: '2026-02-01T09:00:00.000Z',
    estimatedHours: 2,
    actualHours: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    type: 'HOMEWORK',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
    course: { id: 'c1', name: 'Calculus', code: 'MATH101', color: '#10b981' },
    subtasks: [
      {
        id: 's1',
        title: 'Exercise 1',
        status: 'PENDING',
        orderIndex: 0,
        createdAt: '2026-01-10T09:00:00.000Z',
        updatedAt: '2026-01-10T09:00:00.000Z',
      },
    ],
  },
];

function makeStore() {
  return configureStore({
    reducer: { [assignmentsApi.reducerPath]: assignmentsApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: { ignoredActions: [assignmentsApi.reducerPath] },
      }).concat(assignmentsApi.middleware),
  });
}

function failure(config: InternalAxiosRequestConfig, status: number, message: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: { message },
    status,
    statusText: 'Error',
    headers: {},
  } as AxiosResponse);
}

const originalAdapter = httpClient.defaults.adapter;

describe('assignmentsApi (EP05A)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('issues exactly one GET /assignments request with no query parameters', async () => {
    const request = vi
      .spyOn(httpClient, 'request')
      .mockResolvedValue({ data: payload } as AxiosResponse);

    const store = makeStore();
    await store.dispatch(assignmentsApi.endpoints.assignments.initiate());

    expect(request).toHaveBeenCalledTimes(1);
    const config = request.mock.calls[0][0];
    expect(config.url).toBe('/assignments');
    expect(config.method).toBe('GET');
    expect(config.params).toBeUndefined();
    expect(config.data).toBeUndefined();
  });

  it('returns the endpoint’s AssignmentListItem[] unchanged', async () => {
    vi.spyOn(httpClient, 'request').mockResolvedValue({ data: payload } as AxiosResponse);

    const store = makeStore();
    const result = await store.dispatch(assignmentsApi.endpoints.assignments.initiate());

    expect(result.data).toEqual(payload);
    expect(result.data?.[0].course).toEqual(payload[0].course);
    expect(result.data?.[0].subtasks).toEqual(payload[0].subtasks);
    expect(result.data?.[0].status).toBe('PENDING');
  });

  it('surfaces a failed request as the shared { message, code } error shape', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 500, 'Something went wrong');
    };

    const store = makeStore();
    const result = await store.dispatch(assignmentsApi.endpoints.assignments.initiate());

    expect(result.error).toEqual({ message: 'Something went wrong', code: '500' });
  });

  it('exposes the query states to the sections (the hook takes no argument)', async () => {
    vi.spyOn(httpClient, 'request').mockResolvedValue({ data: payload } as AxiosResponse);

    const store = makeStore();
    const wrapper = ({ children }: { children: ReactNode }) => {
      const providerProps = { store, children };
      return createElement(Provider, providerProps);
    };

    const { result } = renderHook(() => assignmentsApi.useAssignmentsQuery(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual(payload);
    expect(typeof result.current.refetch).toBe('function');
  });

  it('exposes the error state and the retry when the request fails', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 500, 'Something went wrong');
    };

    const store = makeStore();
    const wrapper = ({ children }: { children: ReactNode }) => {
      const providerProps = { store, children };
      return createElement(Provider, providerProps);
    };

    const { result } = renderHook(() => assignmentsApi.useAssignmentsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: 'Something went wrong', code: '500' });
    expect(typeof result.current.refetch).toBe('function');
  });
});
