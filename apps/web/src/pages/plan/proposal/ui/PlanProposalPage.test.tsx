import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanProposalPage } from './PlanProposalPage';

vi.mock('@/features/plan-proposal/ui/PlanProposal', () => ({
  PROPOSAL_TITLE: 'Your proposed week',
  PlanProposal: () => <div data-testid="plan-proposal-mock" />,
}));

describe('PlanProposalPage (EP16C-AC2)', () => {
  it('sets document.title to "Your proposed week — StudyPilot" and renders PlanProposal', () => {
    render(
      <MemoryRouter>
        <PlanProposalPage />
      </MemoryRouter>
    );
    expect(document.title).toBe('Your proposed week — StudyPilot');
    expect(screen.getByTestId('plan-proposal-mock')).toBeInTheDocument();
  });
});
