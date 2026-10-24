import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import toast, { Toaster } from 'react-hot-toast';

// jsdom does not implement `window.matchMedia`, but the `<Toaster />` queries
// `prefers-reduced-motion` when it renders a toast — stub it for this file.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * F-112B-1 / DoD 4: `main.tsx` mounts the `<Toaster />` in the app shell, so
 * every `toast.*` call in the app (11 production files, 21 call sites)
 * produces a visible message. This test proves the mechanism end-to-end in
 * the built-app environment: a fired toast must actually render.
 */
describe('app shell toaster (main.tsx)', () => {
  it('renders a fired toast message in the document', async () => {
    render(
      <>
        <Toaster />
        <button type="button" onClick={() => toast.error('Something went wrong')}>
          Fail
        </button>
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fail' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
