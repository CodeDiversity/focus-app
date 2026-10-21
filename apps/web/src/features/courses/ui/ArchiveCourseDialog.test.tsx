import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchiveCourseDialog } from './ArchiveCourseDialog';
import { updateCourse, type CourseWithSemester } from '@/entities/course/api/courseApi';

vi.mock('@/entities/course/api/courseApi', () => ({
  createCourse: vi.fn(),
  listCourses: vi.fn(),
  getCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

const mockedUpdateCourse = vi.mocked(updateCourse);

const timestamps = { createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };

/** An active course (the dialog archives it) and an archived one (restores). */
const activeCourse: CourseWithSemester = {
  id: 'course-1',
  code: 'CS101',
  name: 'Intro to Computer Science',
  description: null,
  color: '#6366f1',
  credits: 4,
  instructor: 'Ada Lovelace',
  isActive: true,
  semesterId: 'sem-1',
  semester: { id: 'sem-1', name: 'Fall 2026' },
  ...timestamps,
};
const archivedCourse: CourseWithSemester = {
  ...activeCourse,
  id: 'course-2',
  code: 'HIST201',
  name: 'World History',
  credits: 3,
  instructor: null,
  isActive: false,
  semesterId: 'sem-2',
  semester: { id: 'sem-2', name: 'Spring 2026' },
};

const validUser = userEvent.setup();

const renderDialog = (course: CourseWithSemester) => {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const view = render(<ArchiveCourseDialog course={course} onDone={onDone} onCancel={onCancel} />);
  return { onDone, onCancel, unmount: view.unmount };
};

const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });

describe('ArchiveCourseDialog (AC 5, D111-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateCourse.mockResolvedValue(activeCourse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the course and states the archive is reversible (nothing is deleted)', () => {
    renderDialog(activeCourse);

    expect(
      screen.getByRole('heading', { name: 'Archive Intro to Computer Science?' })
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/nothing is deleted/i);
    expect(screen.getByRole('dialog')).toHaveTextContent(/restore it at any time/i);
  });

  it('issues PATCH { isActive: false } on confirm (archive) and reports success', async () => {
    const { onDone } = renderDialog(activeCourse);
    await validUser.click(
      screen.getByRole('button', { name: /archive intro to computer science/i })
    );

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-1', { isActive: false })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('offers the restore variant for an archived course and issues PATCH { isActive: true }', async () => {
    const { onDone } = renderDialog(archivedCourse);

    expect(screen.getByRole('heading', { name: 'Restore World History?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/archive it again at any time/i);

    await validUser.click(screen.getByRole('button', { name: /restore world history/i }));

    await waitFor(() =>
      expect(mockedUpdateCourse).toHaveBeenCalledWith('course-2', { isActive: true })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('closes on Cancel without sending a request', async () => {
    const { onCancel } = renderDialog(activeCourse);
    await validUser.click(cancelButton());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedUpdateCourse).not.toHaveBeenCalled();
  });

  it('closes on Escape without sending a request (keyboard)', async () => {
    const { onCancel } = renderDialog(activeCourse);
    await validUser.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedUpdateCourse).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog on open (the safe action) and returns it to the trigger on close', () => {
    // Simulate the trigger (the row's Archive button) holding focus.
    const trigger = document.createElement('button');
    trigger.textContent = 'Row archive trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const view = renderDialog(activeCourse);

    expect(cancelButton()).toHaveFocus();

    // Close through the component's own Escape handler…
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(view.onCancel).toHaveBeenCalledTimes(1);

    // …and the parent unmounts the dialog: the effect cleanup returns focus
    // to the trigger that opened it.
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('traps Tab focus inside the dialog (focus trap)', async () => {
    renderDialog(activeCourse);

    // Opened with focus on Cancel (first). Tab → confirm (last); Tab again
    // wraps back to Cancel instead of escaping the dialog.
    await validUser.tab();
    expect(
      screen.getByRole('button', { name: /archive intro to computer science/i })
    ).toHaveFocus();
    await validUser.tab();
    expect(cancelButton()).toHaveFocus();
    // Shift+Tab from the first wraps to the last.
    await validUser.keyboard('{Shift>}{Tab}{/Shift}');
    expect(
      screen.getByRole('button', { name: /archive intro to computer science/i })
    ).toHaveFocus();
  });

  it('freezes the dialog while the request is in flight (no duplicate request)', async () => {
    // Never resolves during the test; unmount cleans up.
    mockedUpdateCourse.mockImplementation(() => new Promise(() => undefined));
    renderDialog(activeCourse);

    const confirm = screen.getByRole('button', { name: /archive intro to computer science/i });
    await validUser.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(cancelButton()).toBeDisabled();

    // Escape is ignored while the request is in flight.
    await validUser.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an actionable error and allows a retry when the request fails', async () => {
    mockedUpdateCourse.mockRejectedValue({
      response: {
        data: { statusCode: 404, message: 'Resource not found', error: 'Not Found' },
      },
      message: 'Resource not found',
    });
    const { onDone } = renderDialog(activeCourse);
    await validUser.click(
      screen.getByRole('button', { name: /archive intro to computer science/i })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Resource not found');
    expect(onDone).not.toHaveBeenCalled();

    // The confirm button re-enables — the retry is a re-click.
    const confirm = screen.getByRole('button', { name: /archive intro to computer science/i });
    expect(confirm).toBeEnabled();
    mockedUpdateCourse.mockResolvedValue({ ...activeCourse, isActive: false });
    await validUser.click(confirm);
    await waitFor(() => expect(mockedUpdateCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
