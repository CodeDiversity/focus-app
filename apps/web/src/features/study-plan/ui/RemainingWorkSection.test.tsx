import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { RemainingWorkSection } from './RemainingWorkSection';
import { listRemainingWork } from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  listRemainingWork: vi.fn(),
}));

const mocked = vi.mocked(listRemainingWork);

const item = (overrides: Partial<Record<string, unknown>> = {}) => ({
  assignmentId: 'a-1',
  title: 'Essay',
  courseCode: 'CS101',
  dueDate: '2026-11-01',
  estimatedMinutes: 120,
  confirmedMinutes: 0,
  remainingMinutes: 120,
  status: 'PENDING',
  flagged: null,
  ...overrides,
});

function renderSection(props: Record<string, unknown> = {}) {
  return render(
    <Providers>
      <RemainingWorkSection {...props} />
    </Providers>
  );
}

describe('RemainingWorkSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one row per item with title, course, due date, estimate, confirmed, remaining', async () => {
    mocked.mockResolvedValue({ items: [item()], unattributedConfirmedMinutes: 0 } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());
    expect(screen.getByText(/CS101/)).toBeInTheDocument();
    expect(screen.getByText(/Due 2026-11-01/)).toBeInTheDocument();
    expect(screen.getAllByText('2 h 0 min').length).toBeGreaterThan(0);
    expect(screen.getByText('0 min')).toBeInTheDocument();
    expect(screen.getAllByText('2 h 0 min').length).toBeGreaterThan(0);
  });

  it('renders confirmed minutes as 0 when nothing confirmed', async () => {
    mocked.mockResolvedValue({
      items: [item({ confirmedMinutes: 0 })],
      unattributedConfirmedMinutes: 0,
    } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText('0 min')).toBeInTheDocument());
  });

  it('shows marker and not set for MISSING_ESTIMATE', async () => {
    mocked.mockResolvedValue({
      items: [
        item({ flagged: 'MISSING_ESTIMATE', estimatedMinutes: null, remainingMinutes: null }),
      ],
      unattributedConfirmedMinutes: 0,
    } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText('No estimate')).toBeInTheDocument());
    expect(screen.getAllByText('not set').length).toBeGreaterThan(0);
  });

  it('shows marker and keeps estimate for MISSING_DUE_DATE', async () => {
    mocked.mockResolvedValue({
      items: [item({ flagged: 'MISSING_DUE_DATE', dueDate: null })],
      unattributedConfirmedMinutes: 0,
    } as never);
    renderSection();
    await waitFor(() => expect(screen.getAllByText('No due date').length).toBeGreaterThan(0));
    expect(screen.getAllByText('2 h 0 min').length).toBeGreaterThan(0);
  });

  it('renders empty state when no items', async () => {
    mocked.mockResolvedValue({ items: [], unattributedConfirmedMinutes: 0 } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText('Nothing left to do.')).toBeInTheDocument());
  });

  it('renders error state with Try again', async () => {
    mocked.mockRejectedValue(new Error('boom'));
    renderSection();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('Try again re-runs the read', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    mocked.mockResolvedValue({ items: [], unattributedConfirmedMinutes: 0 } as never);
    const user = userEvent.setup();
    renderSection();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));
  });

  it('marker carries text (not colour only)', async () => {
    mocked.mockResolvedValue({
      items: [
        item({ flagged: 'MISSING_ESTIMATE', estimatedMinutes: null, remainingMinutes: null }),
      ],
      unattributedConfirmedMinutes: 0,
    } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText('No estimate')).toBeInTheDocument());
  });

  it('summary line renders total of work left', async () => {
    mocked.mockResolvedValue({ items: [item()], unattributedConfirmedMinutes: 0 } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText(/of work left/)).toBeInTheDocument());
  });

  it('omits summary when all items flagged', async () => {
    mocked.mockResolvedValue({
      items: [
        item({ flagged: 'MISSING_ESTIMATE', estimatedMinutes: null, remainingMinutes: null }),
      ],
      unattributedConfirmedMinutes: 0,
    } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText('No estimate')).toBeInTheDocument());
    expect(screen.queryByText(/of work left/)).not.toBeInTheDocument();
  });

  it('shows skeleton before resolving (no 0 items flash)', () => {
    mocked.mockReturnValue(new Promise(() => {}) as never);
    renderSection();
    // no empty state text
    expect(screen.queryByText('Nothing left to do.')).not.toBeInTheDocument();
  });

  it('renders due date verbatim as YYYY-MM-DD', async () => {
    mocked.mockResolvedValue({
      items: [item({ dueDate: '2026-11-01' })],
      unattributedConfirmedMinutes: 0,
    } as never);
    renderSection();
    await waitFor(() => expect(screen.getByText(/Due 2026-11-01/)).toBeInTheDocument());
  });
});
