import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CatchUpPage } from './CatchUpPage';
import { RecoverySummary } from '@/features/recovery/ui/RecoverySummary';
import { CatchUpPreview } from '@/features/catch-up/ui/CatchUpPreview';

vi.mock('@/features/recovery/ui/RecoverySummary', () => ({
  RecoverySummary: () => <div data-testid="recovery-summary-mock" />,
}));

vi.mock('@/features/catch-up/ui/CatchUpPreview', () => ({
  CatchUpPreview: () => <div data-testid="catch-up-preview-mock" />,
}));

/** The route config mirrors the App.tsx nesting (EP08E decision 2). */
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/catch-up" element={<CatchUpPage />}>
          <Route index element={<RecoverySummary />} />
          <Route path="preview" element={<CatchUpPreview />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('CatchUpPage (layout)', () => {
  it('the index route renders the recovery summary', () => {
    renderAt('/catch-up');
    expect(screen.getByTestId('recovery-summary-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('catch-up-preview-mock')).not.toBeInTheDocument();
  });

  it('the nested preview route renders the catch-up preview', () => {
    renderAt('/catch-up/preview');
    expect(screen.getByTestId('catch-up-preview-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('recovery-summary-mock')).not.toBeInTheDocument();
  });

  it('the layout carries no aria-labelledby — the section ids live in the views', () => {
    const { container } = renderAt('/catch-up');
    expect(container.querySelector('[aria-labelledby]')).toBeNull();
  });
});
