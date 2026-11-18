import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PlanProposalPage } from '@/pages/plan/proposal/ui/PlanProposalPage';

vi.mock('@/features/plan-proposal/ui/PlanProposal', () => ({
  PROPOSAL_TITLE: 'Your proposed week',
  PlanProposal: () => <div data-testid="plan-proposal-mock" />,
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
 * EP16C-AC4 — the retired plan-health and catch-up entry points. The route
 * config mirrors `App.tsx`; every old path lands directly on its final target.
 */
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={['/today', entry]} initialIndex={1}>
      <LocationProbe />
      <Routes>
        <Route path="/plan" element={<div data-testid="plan-page-mock" />} />
        <Route path="/plan/proposal" element={<PlanProposalPage />} />
        <Route path="/plan/health" element={<Navigate to="/plan" replace />} />
        <Route path="/plan/health/catch-up" element={<Navigate to="/plan/proposal" replace />} />
        <Route path="/catch-up" element={<Navigate to="/plan" replace />} />
        <Route path="/catch-up/preview" element={<Navigate to="/plan/proposal" replace />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('retired plan-health and catch-up routes (EP16C-AC4)', () => {
  it('/plan/health lands on /plan', () => {
    renderAt('/plan/health');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan');
    expect(screen.getByTestId('plan-page-mock')).toBeInTheDocument();
  });

  it('/plan/health/catch-up lands on /plan/proposal', () => {
    renderAt('/plan/health/catch-up');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan/proposal');
    expect(screen.getByTestId('plan-proposal-mock')).toBeInTheDocument();
  });

  it('/catch-up lands on /plan', () => {
    renderAt('/catch-up');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan');
  });

  it('/catch-up/preview lands on /plan/proposal', () => {
    renderAt('/catch-up/preview');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan/proposal');
  });

  it('/plan/proposal renders the proposal surface', () => {
    renderAt('/plan/proposal');
    expect(screen.getByTestId('plan-proposal-mock')).toBeInTheDocument();
  });

  it('replaces history so Back does not bounce through the old path', async () => {
    const user = userEvent.setup();
    renderAt('/catch-up');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/plan');
    await user.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/today');
  });
});
