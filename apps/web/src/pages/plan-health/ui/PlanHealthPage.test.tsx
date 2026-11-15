import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PlanHealthPage } from './PlanHealthPage';
import { PlanHealthView } from '@/features/plan-health/ui/PlanHealthView';
import { CatchUpPreview } from '@/features/catch-up/ui/CatchUpPreview';

vi.mock('@/features/plan-health/ui/PlanHealthView', () => ({
  PlanHealthView: () => <div data-testid="plan-health-view-mock" />,
}));

vi.mock('@/features/catch-up/ui/CatchUpPreview', () => ({
  CatchUpPreview: () => <div data-testid="catch-up-preview-mock" />,
}));

/** The route config mirrors the App.tsx nesting (EP13E D-E1). */
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/plan/health" element={<PlanHealthPage />}>
          <Route index element={<PlanHealthView />} />
          <Route path="catch-up" element={<CatchUpPreview />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('PlanHealthPage (layout)', () => {
  it('the index route renders the plan-health view', () => {
    renderAt('/plan/health');
    expect(screen.getByTestId('plan-health-view-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('catch-up-preview-mock')).not.toBeInTheDocument();
  });

  it('the nested catch-up route renders the regeneration preview', () => {
    renderAt('/plan/health/catch-up');
    expect(screen.getByTestId('catch-up-preview-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-health-view-mock')).not.toBeInTheDocument();
  });

  it('the layout carries no aria-labelledby — the section ids live in the views', () => {
    const { container } = renderAt('/plan/health');
    expect(container.querySelector('[aria-labelledby]')).toBeNull();
  });
});
