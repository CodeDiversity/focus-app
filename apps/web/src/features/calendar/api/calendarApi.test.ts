import { describe, it, expect, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { renderHook, waitFor } from '@testing-library/react';
import httpClient from '@/shared/api/httpClient';
import type { CalendarEventsResult } from '@/entities/calendar/model/types';
import { calendarApi } from './calendarApi';

const payload: CalendarEventsResult = {
  timeZone: 'Pacific/Kiritimati',
  today: '2026-01-16',
  from: '2026-01-13',
  to: '2026-01-17',
  days: [],
  events: [
    {
      id: 'class:m1:2026-01-16',
      type: 'CLASS',
      title: 'Calculus',
      subtitle: 'MATH101',
      date: '2026-01-16',
      startTime: '09:00',
      endTime: '10:00',
      courseId: 'c1',
      courseName: 'Calculus',
      courseColor: '#10b981',
      assignmentId: null,
      completed: false,
      focus: false,
      link: '/courses/c1',
    },
  ],
};

function makeStore() {
  return configureStore({
    reducer: { [calendarApi.reducerPath]: calendarApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: { ignoredActions: [calendarApi.reducerPath] },
      }).concat(calendarApi.middleware),
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

describe('calendarApi (EP05A)', () => {
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('issues exactly one GET /calendar/events request carrying only from and to', async () => {
    let captured: InternalAxiosRequestConfig | undefined;
    let callCount = 0;
    httpClient.defaults.adapter = async (config) => {
      captured = config;
      callCount += 1;
      return {
        data: payload,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    const store = makeStore();
    await store.dispatch(
      calendarApi.endpoints.calendarEvents.initiate({ from: '2026-01-13', to: '2026-01-17' })
    );

    expect(callCount).toBe(1);
    expect(captured).toBeDefined();
    expect(captured!.url).toBe('/calendar/events');
    expect(captured!.method).toBe('get');
    expect(captured!.params).toEqual({ from: '2026-01-13', to: '2026-01-17' });
    expect(Object.keys(captured!.params ?? {})).toEqual(['from', 'to']);
    expect(captured!.data).toBeUndefined();
  });

  it('returns the endpoint’s CalendarEventsResult unchanged', async () => {
    httpClient.defaults.adapter = async (config) =>
      ({
        data: payload,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }) as AxiosResponse;

    const store = makeStore();
    const result = await store.dispatch(
      calendarApi.endpoints.calendarEvents.initiate({ from: '2026-01-13', to: '2026-01-17' })
    );

    expect(result.data).toEqual(payload);
    expect(result.data?.today).toBe('2026-01-16');
    expect(result.data?.timeZone).toBe('Pacific/Kiritimati');
    expect(result.data?.events[0].type).toBe('CLASS');
  });

  it('keys the cache on from and to, so different ranges do not collide', async () => {
    let callCount = 0;
    httpClient.defaults.adapter = async (config) => {
      callCount += 1;
      return {
        data: payload,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    const store = makeStore();
    await store.dispatch(
      calendarApi.endpoints.calendarEvents.initiate({ from: '2026-01-13', to: '2026-01-17' })
    );
    await store.dispatch(
      calendarApi.endpoints.calendarEvents.initiate({ from: '2026-01-12', to: '2026-01-16' })
    );

    expect(callCount).toBe(2);
    const state = store.getState() as Record<string, { queries: Record<string, unknown> }>;
    expect(Object.keys(state[calendarApi.reducerPath].queries)).toHaveLength(2);
  });

  it('a 400 answer surfaces the identical error shape after delegation (`{ message, code: "400" }`)', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, 'from must be a valid date');
    };

    const store = makeStore();
    const result = await store.dispatch(
      calendarApi.endpoints.calendarEvents.initiate({ from: '2026-01-13', to: '2026-01-17' })
    );

    expect(result.error).toEqual({ message: 'from must be a valid date', code: '400' });
  });

  it('a 404 answer surfaces `code: "404"` and the uniform message', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, 'Resource not found');
    };

    const store = makeStore();
    const result = await store.dispatch(
      calendarApi.endpoints.calendarEvents.initiate({ from: '2026-01-13', to: '2026-01-17' })
    );

    expect(result.error).toEqual({ message: 'Resource not found', code: '404' });
  });

  it('exposes the query states to the sections', async () => {
    httpClient.defaults.adapter = async (config) =>
      ({
        data: payload,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }) as AxiosResponse;

    const store = makeStore();
    const wrapper = ({ children }: { children: ReactNode }) => {
      const providerProps = { store, children };
      return createElement(Provider, providerProps);
    };

    const { result } = renderHook(
      () => calendarApi.useCalendarEventsQuery({ from: '2026-01-13', to: '2026-01-17' }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual(payload);
    expect(typeof result.current.refetch).toBe('function');
  });
});
