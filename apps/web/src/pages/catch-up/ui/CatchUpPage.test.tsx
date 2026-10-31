import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CatchUpPage } from './CatchUpPage';

vi.mock('@/features/recovery/ui/RecoverySummary', () => ({
  RecoverySummary: () => <div data-testid="recovery-summary-mock" />,
}));

describe('CatchUpPage', () => {
  it('renders RecoverySummary inside layout', () => {
    render(
      <MemoryRouter>
        <CatchUpPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('recovery-summary-mock')).toBeInTheDocument();
  });
});
