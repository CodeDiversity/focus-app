import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import { getMomentum } from './studySessionApi';
import type { MomentumSummary } from '../model/types';

const originalAdapter = httpClient.defaults.adapter;

const payload: MomentumSummary = {
  date: '2026-11-18',
  timeZone: 'UTC',
  today: { confirmedMinutes: 25, goalMinutes: 60, goalMet: false },
  week: {
    startDate: '2026-11-16',
    days: [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ],
    studyDays: ['2026-11-18'],
    studyDayCount: 1,
    goalDays: 3,
    goalMet: false,
  },
  run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false },
  hasHistory: true,
};

describe('studySessionApi.getMomentum (EP13K, D-K5)', () => {
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    tokenStore.clearToken();
  });

  it('getMomentum GETs `/study-sessions/momentum`', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seen = config;
      return { config, data: payload, status: 200, statusText: 'OK', headers: {} } as AxiosResponse;
    };
    await expect(getMomentum()).resolves.toEqual(payload);
    expect(seen?.url).toBe('/study-sessions/momentum');
    expect(seen?.method).toBe('get');
  });
});
