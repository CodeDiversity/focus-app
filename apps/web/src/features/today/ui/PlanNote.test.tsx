import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanNote } from './PlanNote';
import type { RecoverySummary } from '@/entities/study-plan/model/types';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';

const summary = (rolledForwardCount: number): RecoverySummary => ({
  missedSessions: [],
  missedCount: 0,
  rolledForward: [],
  rolledForwardCount,
  rolledForwardMinutes: rolledForwardCount * 60,
  unfinishedWork: [],
  confirmedMinutes: 0,
  message: '',
});

const renderNote = (props: Partial<Parameters<typeof PlanNote>[0]>) =>
  render(
    <MemoryRouter>
      <PlanNote status="ready" {...props} />
    </MemoryRouter>
  );

describe('PlanNote (EP16B-AC1)', () => {
  it('renders the sentence and "See your week" → /plan when rolledForwardCount > 0', () => {
    const { container } = renderNote({ summary: summary(1) });
    expect(screen.getByTestId('plan-note')).toHaveTextContent(
      "Some earlier sessions moved into your current plan — today's list is up to date."
    );
    expect(screen.getByRole('link', { name: 'See your week' })).toHaveAttribute('href', '/plan');
    expectNoForbiddenWords(container);
  });

  it('renders no digit even when rolledForwardCount is 2', () => {
    renderNote({ summary: summary(2) });
    expect(screen.getByTestId('plan-note').textContent).not.toMatch(/\d/);
  });

  it('renders nothing when rolledForwardCount is 0', () => {
    const { container } = renderNote({ summary: summary(0) });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while loading and on error (D-B7)', () => {
    expect(renderNote({ status: 'loading' }).container).toBeEmptyDOMElement();
    expect(renderNote({ status: 'error', summary: summary(3) }).container).toBeEmptyDOMElement();
  });
});
