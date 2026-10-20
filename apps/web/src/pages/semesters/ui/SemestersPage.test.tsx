import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { SemestersPage } from './SemestersPage';
import {
  listSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  type SemesterWithCount,
} from '@/entities/semester/api/semesterApi';

vi.mock('@/entities/semester/api/semesterApi', () => ({
  listSemesters: vi.fn(),
  getSemester: vi.fn(),
  createSemester: vi.fn(),
  updateSemester: vi.fn(),
  deleteSemester: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedListSemesters = vi.mocked(listSemesters);
const mockedCreateSemester = vi.mocked(createSemester);
const mockedUpdateSemester = vi.mocked(updateSemester);
const mockedDeleteSemester = vi.mocked(deleteSemester);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** Two semesters in the API order (startDate desc, then name asc). */
const fall: SemesterWithCount = {
  id: 'sem-1',
  name: 'Fall 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-15',
  isActive: true,
  courseCount: 4,
  ...timestamps,
};
const spring: SemesterWithCount = {
  id: 'sem-2',
  name: 'Spring 2026',
  startDate: '2026-01-05',
  endDate: '2026-05-10',
  isActive: false,
  courseCount: 1,
  ...timestamps,
};

const validUser = userEvent.setup();

const renderPage = () => render(<SemestersPage />);

const nameInput = () => screen.getByLabelText(/semester name/i);
const startDateInput = () => screen.getByLabelText(/start date/i);
const endDateInput = () => screen.getByLabelText(/end date/i);

/** Fills the (create) form with valid values; date inputs via `change` (jsdom). */
const fillValidForm = async () => {
  await validUser.type(nameInput(), 'Summer 2026');
  fireEvent.change(startDateInput(), { target: { value: '2026-06-01' } });
  fireEvent.change(endDateInput(), { target: { value: '2026-08-15' } });
};

describe('SemestersPage list states (AC 1, AC 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading state while the list is in flight', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedListSemesters.mockImplementation(() => new Promise(() => undefined));
    renderPage();

    expect(await screen.findByText(/loading your semesters/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it("renders the student's semesters in API order with badge, dates and course count (AC 1)", async () => {
    mockedListSemesters.mockResolvedValue([fall, spring]);
    renderPage();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Fall 2026');
    expect(items[1]).toHaveTextContent('Spring 2026');
    // Readable dates, badge iff isActive (at most one), course count.
    expect(items[0]).toHaveTextContent('Sep 1, 2026');
    expect(items[0]).toHaveTextContent('Dec 15, 2026');
    expect(items[0]).toHaveTextContent('4 courses');
    expect(screen.getAllByText('Active')).toHaveLength(1);
    expect(items[1]).toHaveTextContent('1 course');
    expect(mockedListSemesters).toHaveBeenCalledTimes(1);
  });

  it('offers the empty state with a create CTA', async () => {
    mockedListSemesters.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No semesters yet')).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /add your first semester/i });
    await validUser.click(cta);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Add a semester' })
    ).toBeInTheDocument();
  });

  it('shows an actionable error with a retry that re-reads the list (AC 5)', async () => {
    mockedListSemesters
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce([fall]);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');

    await validUser.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedListSemesters).toHaveBeenCalledTimes(2));
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Fall 2026');
  });
});

describe('SemestersPage activation (AC 4, D110-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([fall, spring]);
    mockedUpdateSemester.mockResolvedValue(fall);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('activates a non-active row via PATCH { isActive: true } and re-derives the list from the API', async () => {
    // Mount reads the pre-activation state; the re-read after the PATCH
    // returns the single-active state: Spring is now the only active
    // semester.
    mockedListSemesters.mockResolvedValueOnce([fall, spring]).mockResolvedValueOnce([
      { ...fall, isActive: false },
      { ...spring, isActive: true },
    ]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /set spring 2026 as active/i }));

    await waitFor(() =>
      expect(mockedUpdateSemester).toHaveBeenCalledWith('sem-2', { isActive: true })
    );
    // The list re-reads; the badge re-derives from the API response — at most
    // one badge, and it moved to Spring.
    await waitFor(() => expect(mockedListSemesters).toHaveBeenCalledTimes(2));
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveTextContent('Active');
    expect(items[1]).toHaveTextContent('Active');
    expect(screen.getAllByText('Active')).toHaveLength(1);
    // The status change is announced through the live region.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Spring 2026 is now your active semester.'
    );
  });

  it('deactivates the active row via PATCH { isActive: false }', async () => {
    mockedListSemesters
      .mockResolvedValueOnce([fall, spring])
      .mockResolvedValueOnce([{ ...fall, isActive: false }, spring]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /deactivate fall 2026/i }));

    await waitFor(() =>
      expect(mockedUpdateSemester).toHaveBeenCalledWith('sem-1', { isActive: false })
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Fall 2026 deactivated.')
    );
    expect(screen.queryAllByText('Active')).toHaveLength(0);
  });

  it('toasts an actionable error and keeps the list when activation fails', async () => {
    mockedUpdateSemester.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /set spring 2026 as active/i }));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Network Error'));
    // No re-read on failure; the badge state is untouched.
    expect(mockedListSemesters).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Active')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});

describe('SemestersPage create and edit (AC 2, AC 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([fall, spring]);
    mockedCreateSemester.mockResolvedValue({
      ...fall,
      id: 'sem-3',
      name: 'Summer 2026',
      isActive: false,
    });
    mockedUpdateSemester.mockResolvedValue(fall);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a semester from the form; on success the new semester appears in the re-read list', async () => {
    const created: SemesterWithCount = {
      id: 'sem-3',
      name: 'Summer 2026',
      startDate: '2026-06-01',
      endDate: '2026-08-15',
      isActive: false,
      courseCount: 0,
      ...timestamps,
    };
    // Mount reads the pre-create state; the re-read after the create returns
    // the new semester (API order: Summer 2026 starts after Fall 2026, so it
    // sorts first).
    mockedListSemesters
      .mockResolvedValueOnce([fall, spring])
      .mockResolvedValueOnce([created, fall, spring]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /add semester/i }));
    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /create semester/i }));

    await waitFor(() =>
      expect(mockedCreateSemester).toHaveBeenCalledWith({
        name: 'Summer 2026',
        startDate: '2026-06-01',
        endDate: '2026-08-15',
      })
    );
    await waitFor(() => expect(mockedListSemesters).toHaveBeenCalledTimes(2));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Summer 2026');
    expect(screen.getByRole('status')).toHaveTextContent('Summer 2026 created.');
  });

  it('edits a row through the pre-filled form; on success the list re-reads', async () => {
    // Mount reads the pre-edit state; the re-read after the PATCH returns the
    // updated row.
    mockedListSemesters
      .mockResolvedValueOnce([fall, spring])
      .mockResolvedValueOnce([{ ...fall, name: 'Fall 2026 (updated)' }, spring]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /edit fall 2026/i }));
    expect(await screen.findByLabelText(/semester name/i)).toHaveValue('Fall 2026');
    await validUser.clear(nameInput());
    await validUser.type(nameInput(), 'Fall 2026 (updated)');
    await validUser.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedUpdateSemester).toHaveBeenCalledWith('sem-1', {
        name: 'Fall 2026 (updated)',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
      })
    );
    await waitFor(() => expect(mockedListSemesters).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByRole('listitem'))[0]).toHaveTextContent('Fall 2026 (updated)');
    expect(screen.getByRole('status')).toHaveTextContent('Fall 2026 (updated) updated.');
  });

  it('closes the form without a request on Cancel', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /add semester/i }));
    await screen.findByRole('heading', { level: 2, name: 'Add a semester' });
    await validUser.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedCreateSemester).not.toHaveBeenCalled();
    expect(mockedListSemesters).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
  });
});

describe('SemestersPage delete (AC 3, D110-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([fall, spring]);
    mockedDeleteSemester.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes through the confirmation dialog; on success the row is gone and the courses-survive behavior is announced', async () => {
    // Mount reads the pre-delete state; the re-read after the DELETE returns
    // only the remaining semester.
    mockedListSemesters.mockResolvedValueOnce([fall, spring]).mockResolvedValueOnce([spring]);
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /delete fall 2026/i }));

    // The dialog names the semester and warns the courses remain. (Scoped to
    // the dialog: the row's Delete button behind it shares the label.)
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Fall 2026?');
    expect(dialog).toHaveTextContent(/its courses will not be deleted/i);

    await validUser.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(mockedDeleteSemester).toHaveBeenCalledWith('sem-1'));
    await waitFor(() => expect(mockedListSemesters).toHaveBeenCalledTimes(2));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Spring 2026');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Fall 2026 deleted. Its courses remain, unaffiliated.'
    );
  });

  it('closes the dialog on Cancel without sending a request', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    await validUser.click(screen.getByRole('button', { name: /delete fall 2026/i }));
    await screen.findByRole('dialog');
    await validUser.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedDeleteSemester).not.toHaveBeenCalled();
    expect(mockedListSemesters).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('SemestersPage accessibility (AC 5, DoD 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSemesters.mockResolvedValue([fall, spring]);
    mockedDeleteSemester.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('announces status changes through an always-present live region', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    // Present from first render (before any status exists) so changes are
    // announced, and empty at rest.
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('');
  });

  it('opens the delete dialog with the keyboard and returns focus to the trigger on Escape', async () => {
    renderPage();
    const trigger = await screen.findByRole('button', { name: /delete fall 2026/i });
    trigger.focus();
    await validUser.keyboard('{Enter}');

    // The dialog takes focus (its safe action) — the trap is active.
    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();

    await validUser.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedDeleteSemester).not.toHaveBeenCalled();
    // Focus returns to the trigger that opened the dialog.
    expect(trigger).toHaveFocus();
  });

  it('renders a responsive page container with no fixed widths that force horizontal scroll', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    const container = document.querySelector('.max-w-3xl');
    expect(container).not.toBeNull();
    expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
  });
});
