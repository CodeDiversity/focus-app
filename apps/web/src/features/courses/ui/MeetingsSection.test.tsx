import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { MeetingsSection } from './MeetingsSection';
import { createMeeting, updateMeeting, deleteMeeting } from '@/entities/course/api/courseApi';
import type { ClassMeeting } from '@/shared/types/academic';

vi.mock('@/entities/course/api/courseApi', () => ({
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  listMeetings: vi.fn(),
  deleteMeeting: vi.fn(),
  getCourse: vi.fn(),
  listCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedCreateMeeting = vi.mocked(createMeeting);
const mockedUpdateMeeting = vi.mocked(updateMeeting);
const mockedDeleteMeeting = vi.mocked(deleteMeeting);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/**
 * Two meetings in the API order (dayOfWeek asc, then startTime asc): the
 * 09:00 Monday before the 11:00 Monday, then the Wednesday.
 */
const mondayMorning: ClassMeeting = {
  id: 'meeting-1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
  ...timestamps,
};
const mondayLate: ClassMeeting = {
  id: 'meeting-2',
  dayOfWeek: 1,
  startTime: '11:00',
  endTime: '12:00',
  ...timestamps,
};
const wednesday: ClassMeeting = {
  id: 'meeting-3',
  dayOfWeek: 3,
  startTime: '14:00',
  endTime: '15:30',
  ...timestamps,
};

const all = [mondayMorning, mondayLate, wednesday];

const renderSection = (props: Partial<Parameters<typeof MeetingsSection>[0]> = {}) => {
  const onMeetingChanged = vi.fn();
  const view = render(
    <Providers initialEntries={['/courses/course-1']}>
      <MeetingsSection
        courseId="course-1"
        meetings={all}
        onMeetingChanged={onMeetingChanged}
        {...props}
      />
    </Providers>
  );
  return { onMeetingChanged, ...view };
};

describe('MeetingsSection rows (AC 3, D112B-7/9)', () => {
  it('renders the "Mon 09:00–10:30" rows in API order with per-meeting Edit / Delete actions', () => {
    renderSection();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // API order as-is (no client re-sort): the two Mondays keep their given
    // order, then the Wednesday.
    expect(items[0]).toHaveTextContent('Mon 09:00–10:30');
    expect(items[1]).toHaveTextContent('Mon 11:00–12:00');
    expect(items[2]).toHaveTextContent('Wed 14:00–15:30');

    // Per-meeting aria-labels keep the actions unambiguous (D112B-9).
    expect(screen.getByRole('button', { name: /edit mon 09:00–10:30/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete mon 09:00–10:30/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit wed 14:00–15:30/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete wed 14:00–15:30/i })).toBeInTheDocument();
  });

  it('offers the Add meeting button on the section header row', () => {
    renderSection();

    expect(screen.getByRole('heading', { level: 2, name: 'Meetings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add meeting' })).toBeInTheDocument();
  });
});

describe('MeetingsSection empty state (DoD 5)', () => {
  it('offers "No meetings yet" with an Add your first meeting call-to-action', async () => {
    const user = setupUser();
    renderSection({ meetings: [] });

    expect(screen.getByText('No meetings yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add your first meeting/i }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Add a meeting');
  });
});

describe('MeetingsSection add (AC 3, D112B-3/10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateMeeting.mockResolvedValue(mondayMorning);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the MeetingForm dialog from Add meeting; on success it closes and reports "added"', async () => {
    const user = setupUser();
    const { onMeetingChanged } = renderSection();

    await user.click(screen.getByRole('button', { name: 'Add meeting' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Add a meeting');

    await user.selectOptions(screen.getByLabelText('Day'), '2');
    await user.type(screen.getByLabelText('Start time'), '13:00');
    await user.type(screen.getByLabelText('End time'), '14:30');
    await user.click(screen.getByRole('button', { name: 'Create meeting' }));

    await waitFor(() =>
      expect(mockedCreateMeeting).toHaveBeenCalledWith('course-1', {
        dayOfWeek: 2,
        startTime: '13:00',
        endTime: '14:30',
      })
    );
    await waitFor(() => expect(onMeetingChanged).toHaveBeenCalledWith('added'));
    // The dialog closes on success.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Cancel without a request or a change', async () => {
    const user = setupUser();
    const { onMeetingChanged } = renderSection();

    await user.click(screen.getByRole('button', { name: 'Add meeting' }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedCreateMeeting).not.toHaveBeenCalled();
    expect(onMeetingChanged).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MeetingsSection edit (AC 3, D112B-3/10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateMeeting.mockResolvedValue({ ...mondayMorning, endTime: '11:00' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the pre-filled form from a row Edit; on success it closes and reports "updated"', async () => {
    const user = setupUser();
    const { onMeetingChanged } = renderSection();

    await user.click(screen.getByRole('button', { name: /edit mon 09:00–10:30/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Edit Mon 09:00–10:30'
    );
    // Pre-filled from the row.
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End time')).toHaveValue('10:30');

    // Widen the meeting to 09:00–11:00.
    await user.clear(screen.getByLabelText('End time'));
    await user.type(screen.getByLabelText('End time'), '11:00');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockedUpdateMeeting).toHaveBeenCalledWith('course-1', 'meeting-1', {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
      })
    );
    await waitFor(() => expect(onMeetingChanged).toHaveBeenCalledWith('updated'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MeetingsSection delete (AC 3, D112B-9/10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeleteMeeting.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the confirmation from a row Delete; on confirm it deletes and reports "deleted"', async () => {
    const user = setupUser();
    const { onMeetingChanged } = renderSection();

    await user.click(screen.getByRole('button', { name: /delete wed 14:00–15:30/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Wed 14:00–15:30?');
    expect(dialog).toHaveTextContent("This removes the meeting from the course's weekly schedule.");

    // The dialog's confirm shares the row button's aria-label — scope to the
    // dialog (the row button sits behind the backdrop).
    await user.click(within(dialog).getByRole('button', { name: /delete wed 14:00–15:30/i }));

    await waitFor(() => expect(mockedDeleteMeeting).toHaveBeenCalledWith('course-1', 'meeting-3'));
    await waitFor(() => expect(onMeetingChanged).toHaveBeenCalledWith('deleted'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the confirmation on Cancel without a request or a change', async () => {
    const user = setupUser();
    const { onMeetingChanged } = renderSection();

    await user.click(screen.getByRole('button', { name: /delete mon 11:00–12:00/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedDeleteMeeting).not.toHaveBeenCalled();
    expect(onMeetingChanged).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
