import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from '@/test/providers';
import { WorkloadWarnings } from './WorkloadWarnings';

function renderW(props: Record<string, unknown>) {
  return render(
    <Providers>
      <WorkloadWarnings {...props} />
    </Providers>
  );
}

describe('WorkloadWarnings', () => {
  it('renders each warning category with assignment and minutes', () => {
    renderW({
      warnings: [
        {
          assignmentId: 'a',
          assignmentTitle: 'Essay',
          category: 'NO_AVAILABLE_TIME',
          minutes: 90,
          dueDate: null,
        },
        {
          assignmentId: 'b',
          assignmentTitle: 'Lab',
          category: 'INSUFFICIENT_TIME_BEFORE_DEADLINE',
          minutes: 30,
          dueDate: '2026-11-02',
        },
        {
          assignmentId: 'c',
          assignmentTitle: 'Quiz',
          category: 'OVERDUE',
          minutes: 15,
          dueDate: '2026-10-28',
        },
      ],
      deferred: [],
      hasPreview: true,
    });
    expect(screen.getByText(/No free study time this week for "Essay"/)).toBeInTheDocument();
    expect(
      screen.getByText(/30 min of "Lab" do not fit before its 2026-11-02 deadline\./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/"Quiz" was due on 2026-10-28 and 15 min remain\./)
    ).toBeInTheDocument();
  });

  it('renders deferred list separately under Continues in a later plan', () => {
    renderW({
      warnings: [],
      deferred: [{ assignmentId: 'a', minutes: 60, assignmentTitle: 'Essay' }],
      hasPreview: true,
    });
    expect(screen.getByText('Continues in a later plan')).toBeInTheDocument();
    expect(screen.getByText('Essay — 1 h 0 min')).toBeInTheDocument();
  });

  it('renders empty state when no warnings/deferred', () => {
    renderW({ warnings: [], deferred: [], hasPreview: true });
    expect(screen.getByText('Nothing to report.')).toBeInTheDocument();
    expect(screen.getByText('Everything fits in this week.')).toBeInTheDocument();
  });

  it('before a preview exists shows generate a plan description', () => {
    renderW({});
    expect(
      screen.getByText("Generate a plan to see what doesn't fit before a deadline.")
    ).toBeInTheDocument();
  });

  it('error state renders message when errorMessage supplied', () => {
    renderW({ errorMessage: 'boom' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('category sentences are blame-free', () => {
    renderW({
      warnings: [
        {
          assignmentId: 'a',
          assignmentTitle: 'Essay',
          category: 'OVERDUE',
          minutes: 15,
          dueDate: '2026-10-28',
        },
      ],
      deferred: [],
      hasPreview: true,
    });
    expect(screen.getByText(/was due on/)).toBeInTheDocument();
  });

  it('deferred row reads title — minutes', () => {
    renderW({
      warnings: [],
      deferred: [{ assignmentId: 'a', minutes: 45, title: 'Lab' }],
      hasPreview: true,
    });
    expect(screen.getByText('Lab — 45 min')).toBeInTheDocument();
  });
});
