import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PlanHealthPage } from '@/pages/plan-health/ui/PlanHealthPage';
import { PlanHealthView } from '@/features/plan-health/ui/PlanHealthView';
import { CatchUpPreview } from '@/features/catch-up/ui/CatchUpPreview';

vi.mock('@/features/plan-health/ui/PlanHealthView', () => ({
  PlanHealthView: () => <div data-testid="plan-health-view-mock" />,
}));

vi.mock('@/features/catch-up/ui/CatchUpPreview', () => ({
  CatchUpPreview: () => <div data-testid="catch-up-preview-mock" />,
}));

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="pathname">{location.pathname}</span>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
    </>
  );
}

/**
 * EP13E (D-E2) — the legacy `/catch-up` entry points. The route config
 * mirrors `App.tsx`; only these four routes matter to the redirect contract.
 */
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={['/today', entry]} initialIndex={1}>
      <LocationProbe />
      <Routes>
        <Route path="/plan/health" element={<PlanHealthPage />}>
          <Route index element={<PlanHealthView />} />
          <Route path="catch-up" element={<CatchUpPreview />} />
        </Route>
        <Route path="/catch-up" element={<Navigate to="/plan/health" replace />} />
        <Route path="/catch-up/preview" element={<Navigate to="/plan/health/catch-up" replace />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('legacy catch-up routes', () => {
  it('/catch-up lands on plan health', () => {
    renderAt('/catch-up');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan/health');
    expect(screen.getByTestId('plan-health-view-mock')).toBeInTheDocument();
  });

  it('/catch-up/preview lands on the nested regeneration preview', () => {
    renderAt('/catch-up/preview');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan/health/catch-up');
    expect(screen.getByTestId('catch-up-preview-mock')).toBeInTheDocument();
  });

  it('replaces history so Back does not bounce through the old path', async () => {
    const user = userEvent.setup();
    renderAt('/catch-up');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan/health');

    // With `replace`, the legacy entry is gone: Back reaches the page the
    // student came from. Without it, Back would land on `/catch-up` and
    // redirect straight forward again.
    await user.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/today');
  });
});
