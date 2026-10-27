import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { createAssignment, updateAssignment } from '@/entities/assignment/api/assignmentApi';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';
import type { CourseAssignment } from '@/shared/types/academic';
import { AssignmentForm, type AssignmentFormProps } from './AssignmentForm';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const create = vi.mocked(createAssignment);
const update = vi.mocked(updateAssignment);
const submit = () => screen.getByRole('button', { name: 'Create assignment' });
const editSubmit = () => screen.getByRole('button', { name: 'Save changes' });
const title = () => screen.getByLabelText('Title');
const duration = () => screen.getByLabelText('Estimated duration (hours)');
const description = () => screen.getByLabelText('Description');
const renderForm = (props?: Partial<AssignmentFormProps>) => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <Providers initialEntries={['/courses/course-1']}>
      <AssignmentForm courseId="course-1" onSuccess={onSuccess} onClose={onClose} {...props} />
    </Providers>
  );
  return { ...view, onSuccess, onClose };
};
const failure = (statusCode: number, errors?: Record<string, string[]>) => ({
  response: {
    data: {
      statusCode,
      message: statusCode === 404 ? 'Resource not found' : 'Invalid assignment',
      errors,
    },
  },
});
beforeEach(() => {
  vi.resetAllMocks();
});

describe('AssignmentForm', () => {
  it('supports keyboard-only creation and uses the bounded, stacking dialog layout', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('w-full', 'max-w-lg', 'max-h-[90vh]', 'overflow-y-auto');
    expect(duration().closest('.grid')).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    await user.keyboard('Keyboard homework');
    await user.tab();
    expect(screen.getByLabelText('Due date')).toHaveFocus();
    await user.tab();
    expect(duration()).toHaveFocus();
    await user.keyboard('3');
    await user.tab();
    expect(screen.getByLabelText('Type')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Priority')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Description')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(submit()).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(create).toHaveBeenCalledWith({
      title: 'Keyboard homework',
      courseId: 'course-1',
      estimatedHours: 3,
      priority: 'MEDIUM',
    });
  });

  it('labels its fields, defaults priority, focuses title, traps Tab both ways and closes on Escape', async () => {
    const user = setupUser();
    const { onClose } = renderForm();
    expect(screen.getByRole('dialog', { name: 'Add an assignment' })).toHaveAttribute(
      'aria-modal',
      'true'
    );
    expect(title()).toHaveFocus();
    expect(screen.getByLabelText('Due date')).toHaveAttribute('type', 'date');
    expect(duration()).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Priority')).toHaveValue('MEDIUM');
    // The create-mode type select defaults to the unset "No type" state.
    expect(screen.getByLabelText('Type')).toHaveValue('');
    const typeOptions = within(screen.getByLabelText('Type')).getAllByRole('option');
    expect(typeOptions.map((option) => option.textContent)).toEqual([
      'No type',
      'Homework',
      'Paper',
      'Project',
      'Quiz',
      'Exam',
    ]);
    expect(screen.getByText('Optional.')).toBeInTheDocument();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(submit()).toHaveFocus();
    await user.tab();
    expect(title()).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('restores focus to the opening trigger on close', async () => {
    const user = setupUser();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <AssignmentForm
              courseId="course-1"
              onSuccess={() => setOpen(false)}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }
    render(
      <Providers initialEntries={['/courses/course-1']}>
        <Harness />
      </Providers>
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it.each([
    ['   ', 'Title is required'],
    ['x'.repeat(201), 'Title must be 200 characters or fewer'],
  ])('rejects invalid title %s', async (value, message) => {
    const user = setupUser();
    renderForm();
    fireEvent.change(title(), { target: { value } });
    await user.click(submit());
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(title()).toHaveAttribute('aria-invalid', 'true');
    expect(title()).toHaveAccessibleDescription(message);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['0', '-3', '100000'])('rejects invalid estimated duration %s', async (value) => {
    const user = setupUser();
    renderForm();
    await user.type(title(), 'Homework');
    fireEvent.change(duration(), { target: { value } });
    await user.click(submit());
    expect(
      await screen.findByText('Estimated duration must be greater than 0 and at most 1000 hours')
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a past date and converts date parts to local midnight ISO, with numeric hours and selected priority', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    await user.type(title(), 'Problem Set 4');
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2020-01-12' } });
    fireEvent.change(duration(), { target: { value: '2.5' } });
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    await user.click(submit());
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Problem Set 4',
        courseId: 'course-1',
        dueDate: new Date(2020, 0, 12).toISOString(),
        estimatedHours: 2.5,
        priority: 'HIGH',
      })
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('omits blank date and duration', async () => {
    const user = setupUser();
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Homework',
        courseId: 'course-1',
        priority: 'MEDIUM',
      })
    );
  });

  it.each([
    ['HOMEWORK', 'Homework'],
    ['PAPER', 'Paper'],
    ['PROJECT', 'Project'],
    ['QUIZ', 'Quiz'],
    ['EXAM', 'Exam'],
  ])('create submits each closed type (%s → %s) through the shared flow', async (identifier) => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    await user.type(title(), 'Classified work');
    await user.selectOptions(screen.getByLabelText('Type'), identifier);
    await user.click(submit());
    // Exact-object assert: `type` is present, every unset optional key is not.
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Classified work',
        courseId: 'course-1',
        priority: 'MEDIUM',
        type: identifier,
      })
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('create "No type" submits no type key at all (never an explicit null)', async () => {
    const user = setupUser();
    const { onSuccess } = renderForm();
    await user.type(title(), 'Untyped work');
    await user.selectOptions(screen.getByLabelText('Type'), '');
    await user.click(submit());
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Untyped work',
        courseId: 'course-1',
        priority: 'MEDIUM',
      })
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('maps server 400 field errors to every form field including type', async () => {
    const user = setupUser();
    create.mockRejectedValue(
      failure(400, {
        title: ['Server title'],
        dueDate: ['Server date'],
        estimatedHours: ['Server duration'],
        priority: ['Server priority'],
        type: ['Server type'],
      })
    );
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    for (const message of [
      'Server title',
      'Server date',
      'Server duration',
      'Server priority',
      'Server type',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Priority')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Type')).toHaveAttribute('aria-invalid', 'true');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('toasts a 400 that names no form field', async () => {
    const user = setupUser();
    create.mockRejectedValue(failure(400, { status: ['Not supported'] }));
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid assignment'));
  });

  it('offers the course recovery link on 404', async () => {
    const user = setupUser();
    create.mockRejectedValue(failure(404));
    renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Resource not found — this course may no longer exist.');
    expect(within(alert).getByRole('link', { name: 'Back to courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
  });

  it.each([new Error('Network Error'), failure(500)])(
    'preserves values and enables retry after network/5xx failure',
    async (error) => {
      const user = setupUser();
      create.mockRejectedValueOnce(error);
      const { onSuccess } = renderForm();
      await user.type(title(), 'Homework');
      await user.click(submit());
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('We could not save the assignment. Try again.')
      );
      expect(title()).toHaveValue('Homework');
      expect(submit()).toBeEnabled();
      await user.click(submit());
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    }
  );

  it('disables fields and prevents duplicate requests while in flight; Tab stays inside', async () => {
    const user = setupUser();
    let resolve!: () => void;
    create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = () => done({} as Awaited<ReturnType<typeof createAssignment>>);
        })
    );
    const { onSuccess } = renderForm();
    await user.type(title(), 'Homework');
    await user.click(submit());
    await waitFor(() => expect(submit()).toBeDisabled());
    for (const label of ['Title', 'Due date', 'Estimated duration (hours)', 'Type', 'Priority'])
      expect(screen.getByLabelText(label)).toBeDisabled();
    await user.tab();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    await user.click(submit());
    expect(create).toHaveBeenCalledOnce();
    await act(async () => resolve());
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  describe('edit mode (AC 3, AC 4, AC 5, D114E-1…6)', () => {
    const sampleAssignment: CourseAssignment = {
      id: 'assignment-1',
      title: 'Problem Set 4',
      description: 'Chapters 1-3 homework',
      dueDate: '2026-10-24T12:00:00.000Z',
      estimatedHours: 3.5,
      actualHours: null,
      status: 'PENDING',
      priority: 'HIGH',
      type: 'HOMEWORK',
      subtasks: [],
      createdAt: '2026-10-18T12:00:00.000Z',
      updatedAt: '2026-10-18T12:00:00.000Z',
    };

    it('populates initial values in edit mode and switches title, button, and field hints', () => {
      renderForm({ assignment: sampleAssignment });

      expect(
        screen.getByRole('heading', { level: 2, name: 'Edit assignment' })
      ).toBeInTheDocument();
      expect(editSubmit()).toBeInTheDocument();
      expect(title()).toHaveValue('Problem Set 4');
      const d = new Date(sampleAssignment.dueDate!);
      const expectedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(screen.getByLabelText('Due date')).toHaveValue(expectedDate);
      expect(duration()).toHaveValue(3.5);
      expect(screen.getByLabelText('Priority')).toHaveValue('HIGH');
      expect(screen.getByLabelText('Type')).toHaveValue('HOMEWORK');
      // A stored type offers no "No type" escape: the API cannot return to
      // null (D115-3), so the select only shows the five identifiers.
      const typeOptions = within(screen.getByLabelText('Type')).getAllByRole('option');
      expect(typeOptions.map((option) => option.textContent)).toEqual([
        'Homework',
        'Paper',
        'Project',
        'Quiz',
        'Exam',
      ]);
      // Edit-mode hints (D114E-6)
      expect(
        screen.getByText('Optional — leave blank to keep the current due date.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Optional — leave blank to keep the current duration.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Pick a different value to change the priority.')
      ).toBeInTheDocument();
      expect(screen.getByText('Pick a different value to change the type.')).toBeInTheDocument();
      expect(description()).toHaveValue('Chapters 1-3 homework');
      expect(
        screen.getByText('Optional — up to 2000 characters. Leave blank to clear.')
      ).toBeInTheDocument();
    });

    it('submits PATCH request via updateAssignment on edit and handles null semantics for blanks', async () => {
      const user = setupUser();
      update.mockResolvedValue({ ...sampleAssignment, title: 'Updated PS4' });
      const { onSuccess } = renderForm({ assignment: sampleAssignment });

      await user.clear(title());
      await user.type(title(), 'Updated PS4');
      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-11-01' } });
      fireEvent.change(duration(), { target: { value: '5' } });
      await user.selectOptions(screen.getByLabelText('Priority'), 'URGENT');
      await user.selectOptions(screen.getByLabelText('Type'), 'QUIZ');
      await user.clear(description());
      await user.type(description(), 'New instructions');

      await user.click(editSubmit());

      await waitFor(() =>
        expect(update).toHaveBeenCalledWith('assignment-1', {
          title: 'Updated PS4',
          priority: 'URGENT',
          dueDate: new Date(2026, 10, 1).toISOString(),
          estimatedHours: 5,
          type: 'QUIZ',
          description: 'New instructions',
        })
      );
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('sends null for blank due date/duration and empty string for blanked description', async () => {
      const user = setupUser();
      update.mockResolvedValue(sampleAssignment);
      const { onSuccess } = renderForm({ assignment: sampleAssignment });

      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
      fireEvent.change(duration(), { target: { value: '' } });
      await user.clear(description());

      await user.click(editSubmit());

      await waitFor(() =>
        expect(update).toHaveBeenCalledWith('assignment-1', {
          title: 'Problem Set 4',
          priority: 'HIGH',
          dueDate: null,
          estimatedHours: null,
          type: 'HOMEWORK',
          description: '',
        })
      );
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    describe('edit with a stored null type (SP-115H AC 1)', () => {
      const untypedAssignment: CourseAssignment = { ...sampleAssignment, type: null };

      it('shows "No type" selected and submits no type key when unchanged', async () => {
        const user = setupUser();
        update.mockResolvedValue(untypedAssignment);
        const { onSuccess } = renderForm({ assignment: untypedAssignment });
        const typeSelect = screen.getByLabelText('Type');
        expect(typeSelect).toHaveValue('');
        // A select must display the real unset state — here nothing is
        // stored, so the label is true. The hint does not promise a clear.
        expect(within(typeSelect).getByRole('option', { name: 'No type' })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
        fireEvent.change(duration(), { target: { value: '' } });
        await user.clear(description());
        await user.click(editSubmit());
        await waitFor(() =>
          expect(update).toHaveBeenCalledWith('assignment-1', {
            title: 'Problem Set 4',
            priority: 'HIGH',
            dueDate: null,
            estimatedHours: null,
            description: '',
          })
        );
        expect(toast.error).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledOnce();
      });

      it('sets a type from the null state and submits it', async () => {
        const user = setupUser();
        update.mockResolvedValue({ ...untypedAssignment, type: 'EXAM' });
        renderForm({ assignment: untypedAssignment });
        await user.selectOptions(screen.getByLabelText('Type'), 'EXAM');
        await user.click(editSubmit());
        await waitFor(() =>
          expect(update).toHaveBeenCalledWith(
            'assignment-1',
            expect.objectContaining({ type: 'EXAM' })
          )
        );
      });
    });

    it('handles 400 field validation errors on edit', async () => {
      const user = setupUser();
      update.mockRejectedValue(
        failure(400, {
          title: ['Server title error'],
          dueDate: ['Server due date error'],
          estimatedHours: ['Server estimated hours error'],
          priority: ['Server priority error'],
          type: ['Server type error'],
          description: ['Server description error'],
        })
      );
      renderForm({ assignment: sampleAssignment });

      await user.click(editSubmit());

      for (const msg of [
        'Server title error',
        'Server due date error',
        'Server estimated hours error',
        'Server priority error',
        'Server type error',
        'Server description error',
      ]) {
        expect(await screen.findByText(msg)).toBeInTheDocument();
      }
      // The type 400 is a field error on the type control (SP-115H AC 3),
      // not a toast.
      expect(screen.getByLabelText('Type')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Type')).toHaveAccessibleDescription('Server type error');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('handles 404 not found error on edit', async () => {
      const user = setupUser();
      update.mockRejectedValue(failure(404));
      renderForm({ assignment: sampleAssignment });

      await user.click(editSubmit());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'Resource not found — this course or assignment may no longer exist.'
      );
      expect(within(alert).getByRole('link', { name: 'Back to courses' })).toHaveAttribute(
        'href',
        '/courses'
      );
    });

    it('traps Tab key and closes on Escape in edit mode', async () => {
      const user = setupUser();
      const { onClose } = renderForm({ assignment: sampleAssignment });

      expect(title()).toHaveFocus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(editSubmit()).toHaveFocus();
      await user.tab();
      expect(title()).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('cross-course create course select (SP-124C AC 1–5)', () => {
    const courses = [
      { id: 'course-1', code: 'MATH101', name: 'Calculus I' },
      { id: 'course-2', code: 'HIST201', name: 'Modern History' },
    ] as unknown as CourseWithSemester[];
    const sampleAssignment: CourseAssignment = {
      id: 'assignment-1',
      title: 'Problem Set 4',
      description: null,
      dueDate: null,
      estimatedHours: null,
      actualHours: null,
      status: 'PENDING',
      priority: 'HIGH',
      type: 'HOMEWORK',
      subtasks: [],
      createdAt: '2026-10-18T12:00:00.000Z',
      updatedAt: '2026-10-18T12:00:00.000Z',
    };

    it('renders the select below Title with No course first and the caller courses', () => {
      renderForm({ courseId: undefined, courses });
      const select = screen.getByLabelText('Course');
      expect(select).toHaveValue('');
      expect(
        within(select)
          .getAllByRole('option')
          .map((option) => option.textContent)
      ).toEqual(['No course', 'MATH101 Calculus I', 'HIST201 Modern History']);
      expect(
        screen.getByText('Optional — choose a course or leave unassigned.')
      ).toBeInTheDocument();
      // The field sits directly below Title, above the due-date grid.
      expect(
        title().compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        select.compareDocumentPosition(screen.getByLabelText('Due date')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('omits courseId from the create payload when "No course" is selected', async () => {
      const user = setupUser();
      const { onSuccess } = renderForm({ courseId: undefined, courses });
      await user.type(title(), 'Unowned homework');
      await user.click(submit());
      await waitFor(() =>
        expect(create).toHaveBeenCalledWith({ title: 'Unowned homework', priority: 'MEDIUM' })
      );
      expect(create.mock.calls[0]?.[0]).not.toHaveProperty('courseId');
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('sends the selected course id', async () => {
      const user = setupUser();
      renderForm({ courseId: undefined, courses });
      await user.type(title(), 'Class homework');
      await user.selectOptions(screen.getByLabelText('Course'), 'course-2');
      await user.click(submit());
      await waitFor(() =>
        expect(create).toHaveBeenCalledWith({
          title: 'Class homework',
          courseId: 'course-2',
          priority: 'MEDIUM',
        })
      );
    });

    it('prefills the active list filter when that course is offered', () => {
      renderForm({ courseId: undefined, courses, initialCourseId: 'course-2' });
      expect(screen.getByLabelText('Course')).toHaveValue('course-2');
    });

    it('falls back to "No course" when the initial id is not in the course list', () => {
      renderForm({ courseId: undefined, courses, initialCourseId: 'course-9' });
      expect(screen.getByLabelText('Course')).toHaveValue('');
    });

    it('applies the filter prefill when the course list resolves after opening', () => {
      const props = {
        courseId: undefined,
        initialCourseId: 'course-1',
        onSuccess: vi.fn(),
        onClose: vi.fn(),
      };
      const { rerender } = render(
        <Providers initialEntries={['/assignments']}>
          <AssignmentForm courses={[]} {...props} />
        </Providers>
      );
      expect(screen.getByLabelText('Course')).toHaveValue('');
      rerender(
        <Providers initialEntries={['/assignments']}>
          <AssignmentForm courses={courses} {...props} />
        </Providers>
      );
      expect(screen.getByLabelText('Course')).toHaveValue('course-1');
    });

    it('hides the select for a fixed course host and still sends that course', async () => {
      const user = setupUser();
      const { onSuccess } = renderForm({ courses });
      expect(screen.queryByLabelText('Course')).not.toBeInTheDocument();
      await user.type(title(), 'Course homework');
      await user.click(submit());
      await waitFor(() =>
        expect(create).toHaveBeenCalledWith({
          title: 'Course homework',
          courseId: 'course-1',
          priority: 'MEDIUM',
        })
      );
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('never renders the select in edit mode', () => {
      renderForm({ courseId: undefined, courses, assignment: sampleAssignment });
      expect(screen.queryByLabelText('Course')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Edit assignment' })).toBeInTheDocument();
    });

    it('tabs from Title through the course select before the date fields', async () => {
      const user = setupUser();
      renderForm({ courseId: undefined, courses });
      expect(title()).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText('Course')).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText('Due date')).toHaveFocus();
    });

    it('maps a 400 courseId field error onto the select', async () => {
      const user = setupUser();
      create.mockRejectedValue(failure(400, { courseId: ['Choose one of your courses'] }));
      renderForm({ courseId: undefined, courses });
      await user.type(title(), 'Homework');
      await user.click(submit());
      expect(await screen.findByText('Choose one of your courses')).toBeInTheDocument();
      expect(screen.getByLabelText('Course')).toHaveAttribute('aria-invalid', 'true');
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
