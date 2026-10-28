import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import httpClient from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';
import {
  listAvailabilitySlots,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  type AvailabilitySlot,
} from './availabilityApi';

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
 * A created slot — the canonical 7-key shape (SP-128A contract; `userId` is
 * never exposed). `dayOfWeek` Monday=1; times are stored `HH:mm`.
 */
const timestamps = { createdAt: '2026-10-28T12:00:00.000Z', updatedAt: '2026-10-28T12:00:00.000Z' };

const madeSlot: AvailabilitySlot = {
  id: 'slot-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  isAvailable: true,
  ...timestamps,
};

describe('availabilityApi.listAvailabilitySlots', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('GETs /availability-slots and returns the API order as-is (no client re-sort)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    // SP-128A orders `dayOfWeek` asc then `startTime` asc (Sunday-first);
    // the page's Monday-first sections are presentation grouping only.
    const rows: AvailabilitySlot[] = [
      { ...madeSlot, id: 'slot-sun', dayOfWeek: 0, startTime: '18:00', endTime: '19:00' },
      madeSlot,
      {
        ...madeSlot,
        id: 'slot-wed',
        dayOfWeek: 3,
        startTime: '20:00',
        endTime: '22:00',
        isAvailable: false,
      },
    ];
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, rows, 200);
    };

    await expect(listAvailabilitySlots()).resolves.toEqual(rows);
    expect(seenConfig?.url).toBe('/availability-slots');
    expect(seenConfig?.method).toBe('get');
  });
});

describe('availabilityApi.createAvailabilitySlot', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('POSTs only the editable fields (dayOfWeek, startTime, endTime, isAvailable) and returns the 7-key shape', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, madeSlot);
    };

    await expect(
      createAvailabilitySlot({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        isAvailable: true,
      })
    ).resolves.toEqual(madeSlot);
    expect(seenConfig?.url).toBe('/availability-slots');
    expect(seenConfig?.method).toBe('post');
    // The body is the contract: exactly the four editable fields — no id,
    // no createdAt/updatedAt, no userId (the principal owns the body).
    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
      isAvailable: true,
    });
  });

  it('sends a blocked time as isAvailable: false (AC-E04-05)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, { ...madeSlot, isAvailable: false });
    };

    await createAvailabilitySlot({
      dayOfWeek: 3,
      startTime: '20:00',
      endTime: '22:00',
      isAvailable: false,
    });

    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      dayOfWeek: 3,
      startTime: '20:00',
      endTime: '22:00',
      isAvailable: false,
    });
  });

  it('rejects an invalid slot with the field-level 400 `errors` map preserved', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['endTime must be strictly after startTime (same day)'],
        error: 'Bad Request',
        errors: { endTime: ['endTime must be strictly after startTime (same day)'] },
      });
    };

    await expect(
      createAvailabilitySlot({
        dayOfWeek: 1,
        startTime: '10:30',
        endTime: '09:00',
        isAvailable: true,
      })
    ).rejects.toMatchObject({
      response: {
        data: {
          statusCode: 400,
          errors: { endTime: ['endTime must be strictly after startTime (same day)'] },
        },
      },
    });
  });

  it('rejects a duplicate week slot with the 409 message the form alerts on', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 409, {
        statusCode: 409,
        message: 'An availability slot already exists at this time.',
        error: 'Conflict',
      });
    };

    await expect(
      createAvailabilitySlot({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        isAvailable: true,
      })
    ).rejects.toMatchObject({
      message: 'An availability slot already exists at this time.',
      response: { data: { statusCode: 409 } },
    });
  });
});

describe('availabilityApi.updateAvailabilitySlot', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('PATCHes /availability-slots/:id with the partial body and returns the updated shape', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const updated: AvailabilitySlot = {
      ...madeSlot,
      startTime: '14:00',
      endTime: '15:00',
      isAvailable: false,
    };
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, updated, 200);
    };

    await expect(
      updateAvailabilitySlot('slot-1', { startTime: '14:00', endTime: '15:00', isAvailable: false })
    ).resolves.toEqual(updated);
    expect(seenConfig?.url).toBe('/availability-slots/slot-1');
    expect(seenConfig?.method).toBe('patch');
    expect(JSON.parse(seenConfig!.data as string)).toEqual({
      startTime: '14:00',
      endTime: '15:00',
      isAvailable: false,
    });
  });

  it('rejects a missing/foreign slot (or malformed id) with the uniform 404', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(updateAvailabilitySlot('slot-1', { endTime: '15:00' })).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404, message: 'Resource not found' } },
    });
  });

  it('rejects a merged-value violation with the field-level 400 `errors` map', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 400, {
        statusCode: 400,
        message: ['endTime must be strictly after startTime (same day)'],
        error: 'Bad Request',
        errors: { endTime: ['endTime must be strictly after startTime (same day)'] },
      });
    };

    await expect(updateAvailabilitySlot('slot-1', { endTime: '08:30' })).rejects.toMatchObject({
      response: {
        data: {
          statusCode: 400,
          errors: { endTime: ['endTime must be strictly after startTime (same day)'] },
        },
      },
    });
  });
});

describe('availabilityApi.deleteAvailabilitySlot', () => {
  beforeEach(() => {
    tokenStore.clearToken();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('DELETEs /availability-slots/:id (204, no body)', async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      seenConfig = config;
      return ok(config, undefined, 204);
    };

    await expect(deleteAvailabilitySlot('slot-1')).resolves.toBeUndefined();
    expect(seenConfig?.url).toBe('/availability-slots/slot-1');
    expect(seenConfig?.method).toBe('delete');
  });

  it('rejects a missing/foreign slot (or repeated delete) with the uniform 404', async () => {
    httpClient.defaults.adapter = async (config) => {
      throw failure(config, 404, {
        statusCode: 404,
        message: 'Resource not found',
        error: 'Not Found',
      });
    };

    await expect(deleteAvailabilitySlot('slot-1')).rejects.toMatchObject({
      message: 'Resource not found',
      response: { data: { statusCode: 404, message: 'Resource not found' } },
    });
  });
});
