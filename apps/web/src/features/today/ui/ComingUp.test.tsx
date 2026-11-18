import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ComingUp } from './ComingUp';
import type { AssignmentListItem } from '@/shared/types/academic';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';

function row(overrides: Partial<AssignmentListItem> & { id: string }): AssignmentListItem {
  return {
    title: `Task ${overrides.id}`,
    description: null,
    dueDate: '2999-01-01T12:00:00.000Z',
    estimatedHours: null,
    actualHours: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    type: null,
    hard: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    course: null,
    subtasks: [],
    ...overrides,
  };
}

const rows = [
  row({ id: 'u1', dueDate: '2999-01-02T12:00:00.000Z' }),
  row({ id: 'p1', dueDate: '2020-01-05T12:00:00.000Z' }),
  row({ id: 'u2', dueDate: '2999-01-03T12:00:00.000Z' }),
  row({ id: 'u3', dueDate: '2999-01-04T12:00:00.000Z' }),
  row({ id: 'u4', dueDate: '2999-01-05T12:00:00.000Z' }),
  row({ id: 'none', dueDate: null }),
  row({ id: 'done', dueDate: '2020-01-01T12:00:00.000Z', status: 'COMPLETED' }),
];

const renderComingUp = (props: Partial<Parameters<typeof ComingUp>[0]> = {}) => {
  const onOpenDetails = vi.fn();
  const onRetry = vi.fn();
  const view = render(
    <MemoryRouter>
      <ComingUp
        rows={rows}
        timeZone="UTC"
        status="ready"
        onRetry={onRetry}
        onOpenDetails={onOpenDetails}
        {...props}
      />
    </MemoryRouter>
  );
  return { ...view, onOpenDetails, onRetry };
};

const titles = () =>
  screen.getAllByRole('listitem').map((li) => within(li).getByRole('button').textContent);

describe('ComingUp (EP16B-AC3)', () => {
  it('orders past-due rows first, then upcoming by due date, no-due-date last; caps at five', () => {
    renderComingUp();
    expect(titles()).toEqual(['Task p1', 'Task u1', 'Task u2', 'Task u3', 'Task u4']);
  });

  it('always shows "All assignments" → /assignments, even with a single row', () => {
    renderComingUp();
    expect(screen.getByRole('link', { name: 'All assignments' })).toHaveAttribute(
      'href',
      '/assignments'
    );
    renderComingUp({ rows: [rows[0]] });
    expect(screen.getAllByRole('link', { name: 'All assignments' })).toHaveLength(2);
  });

  it('"Past due" badge on past-due rows only, as text', () => {
    renderComingUp();
    const badges = screen.getAllByText('Past due');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('li')).toHaveTextContent('Task p1');
  });

  it('the heading is "Coming up" with no digit', () => {
    renderComingUp();
    expect(screen.getByRole('heading', { level: 2, name: 'Coming up' }).textContent).not.toMatch(
      /\d/
    );
  });

  it("a row's title calls onOpenDetails with that row once", async () => {
    const { onOpenDetails } = renderComingUp();
    await userEvent.click(screen.getByRole('button', { name: 'Task u2' }));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onOpenDetails).toHaveBeenCalledWith(rows[2]);
  });

  it('renders nothing when there are no unfinished assignments; finished rows never appear', () => {
    const { container } = renderComingUp({ rows: [rows[6]] });
    expect(container).toBeEmptyDOMElement();
    renderComingUp();
    expect(screen.queryByText('Task done')).toBeNull();
  });

  it('loading renders the heading and three skeleton rows inside aria-busy', () => {
    const { container } = renderComingUp({ status: 'loading', rows: [] });
    expect(screen.getByRole('heading', { name: 'Coming up' })).toBeInTheDocument();
    expect(
      container.querySelector('[aria-busy="true"]')?.querySelectorAll('.animate-pulse')
    ).toHaveLength(3);
  });

  it('error renders the message line (not an alert) and Try again calls onRetry', async () => {
    const { onRetry } = renderComingUp({ status: 'error', rows: [] });
    expect(screen.getByText("We couldn't load your assignments.")).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('rows keep a divided list with no card chrome of their own, and no forbidden word renders', () => {
    const { container } = renderComingUp();
    expect(container.querySelector('ul')?.className).toContain('divide-y');
    expect(container.querySelector('li')?.className).not.toContain('border');
    expectNoForbiddenWords(container);
  });
});
