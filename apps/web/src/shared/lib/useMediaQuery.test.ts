import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function installMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: () => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      listeners.delete(cb);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return {
    listeners,
    set(value: boolean) {
      matches = value;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
  };
}

describe('useMediaQuery (EP16E, D-E2)', () => {
  it('returns the fallback when matchMedia is unavailable', () => {
    // jsdom without a stub.
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const desktop = renderHook(() => useMediaQuery('(min-width: 768px)', true));
    expect(desktop.result.current).toBe(true);
    desktop.unmount();

    const narrow = renderHook(() => useMediaQuery('(min-width: 768px)', false));
    expect(narrow.result.current).toBe(false);
    narrow.unmount();
  });

  it('returns the current match and updates on change', () => {
    const media = installMatchMedia(false);
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 768px)', true));
    expect(result.current).toBe(false);

    media.set(true);
    expect(result.current).toBe(true);

    media.set(false);
    expect(result.current).toBe(false);
    unmount();
  });

  it('unsubscribes on unmount', () => {
    const media = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)', true));
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
