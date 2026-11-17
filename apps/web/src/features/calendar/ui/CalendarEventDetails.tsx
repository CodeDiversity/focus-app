import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { formatDate } from '@/shared/lib/datetime';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import { WeeklyChoicePrompt } from '@/features/schedule-blocks/ui/WeeklyChoicePrompt';
import { TYPE_META, typeLabel } from './CalendarEventChip';

/** EP15G-AC2: how a removal applies — the whole block, this occurrence, or this and following weeks. */
export type DeleteChoice = 'all' | 'this-day' | 'following';

export const REMOVE_PROMPT = 'This repeats weekly. Remove it for:';

export interface CalendarEventDetailsProps {
  event: CalendarEvent;
  timeZone: string;
  onClose: () => void;
  /** EP15E (D-E3): extra footer actions; rendered left of Close. */
  actions?: ReactNode;
  /** EP15G: Edit for EVENT / STUDY_BLOCK — closes this dialog and opens the sheet (the page's job). */
  onEdit?: () => void;
  /**
   * EP15G (D-G5): Remove for EVENT / STUDY_BLOCK. A one-off asks "Remove this?"
   * inline; a weekly item asks the two-choice question inline — never a second
   * dialog. Resolves when the request is done (the page closes and announces);
   * rejects to leave the dialog open with its footer restored.
   */
  onDelete?: (choice: DeleteChoice) => Promise<void> | void;
}

const ENERGY_TEXT = { HIGH: 'High energy', NORMAL: 'Normal', LOW: 'Low energy' } as const;

/**
 * Details dialog (D127B-6): modal dialog copying the ArchiveCourseDialog pattern
 * (role="dialog", aria-modal, Escape closes, focus trap, focus returns to the
 * trigger). Fields: type, title, date, time, repeats (weekly blocks), course
 * (link), energy (study blocks), completed state, focus flag. EP15E keeps it
 * on the shared Dialog (D-E3) and adds the `actions` slot; the Close button
 * stays last in DOM order.
 */
export function CalendarEventDetails({
  event,
  timeZone,
  onClose,
  actions,
  onEdit,
  onDelete,
}: CalendarEventDetailsProps) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const label = typeLabel(event);
  const dateLabel = formatDate(new Date(`${event.date}T12:00:00Z`), timeZone);
  // EP13H2 (F-EP13H-03): a day-anchored session's stored times are the
  // engine's *suggestion* — the dialog must not re-promise the clock slot the
  // chip deliberately hides. Time reads "Anytime"; the suggestion gets its
  // own honestly-labelled row below.
  const flex = event.anchor === 'FLEX_DAY';
  const clockLabel = event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime;
  const timeLabel = flex ? 'Anytime' : clockLabel;
  const isDeadline = event.type === 'ASSIGNMENT_DEADLINE' || event.type === 'EXAM_DEADLINE';
  const isBlock = event.type === 'EVENT' || event.type === 'STUDY_BLOCK';

  // EP15G (D-G5): the footer's three states. Only blocks get Edit / Remove.
  const [footer, setFooter] = useState<'idle' | 'confirm' | 'prompt'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const removeRef = useRef<HTMLButtonElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const showActions = isBlock && (onEdit || onDelete);
  useEffect(() => {
    if (footer === 'confirm') noRef.current?.focus();
  }, [footer]);

  const backToIdle = () => {
    setFooter('idle');
    window.setTimeout(() => removeRef.current?.focus(), 0);
  };
  const requestClose = () => {
    if (isDeleting) return;
    if (footer !== 'idle') {
      backToIdle();
      return;
    }
    onClose();
  };
  const remove = async (choice: DeleteChoice) => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(choice);
    } catch {
      setIsDeleting(false);
      backToIdle();
      return;
    }
    // The page closes the dialog on success; if it keeps it open, the footer is whole again.
    setIsDeleting(false);
    setFooter('idle');
  };

  return (
    <Dialog open onClose={requestClose} title={event.title} size="md" busy={isDeleting}>
      <dl className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <dt className="font-medium text-text-muted">Type</dt>
          <dd className="flex items-center gap-1 text-text">
            <Icon aria-hidden size={14} />
            {label}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Date</dt>
          <dd className="text-text">{dateLabel}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Time</dt>
          <dd className="text-text">{timeLabel}</dd>
        </div>
        {flex && (
          <div>
            <dt className="font-medium text-text-muted">Suggested</dt>
            <dd className="text-text">{clockLabel}</dd>
          </div>
        )}
        {isBlock && event.recurring && (
          <div>
            <dt className="font-medium text-text-muted">Repeats</dt>
            <dd className="text-text">Weekly</dd>
          </div>
        )}
        {event.courseName && (
          <div>
            <dt className="font-medium text-text-muted">Course</dt>
            <dd className="flex items-center gap-2 text-text">
              {event.courseColor && (
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: event.courseColor }}
                />
              )}
              {event.courseId ? (
                <Link
                  to={event.link ?? `/courses/${event.courseId}`}
                  className="text-accent underline focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {event.courseName}
                </Link>
              ) : (
                event.courseName
              )}
            </dd>
          </div>
        )}
        {event.type === 'STUDY_BLOCK' && (
          <div>
            <dt className="font-medium text-text-muted">Energy</dt>
            <dd className="text-text">{ENERGY_TEXT[event.energy ?? 'NORMAL']}</dd>
          </div>
        )}
        {isDeadline && (
          <div>
            <dt className="font-medium text-text-muted">Status</dt>
            <dd className="text-text">{event.completed ? 'Completed' : 'Not completed'}</dd>
          </div>
        )}
        {event.type === 'STUDY_SESSION' && (
          <div>
            <dt className="font-medium text-text-muted">Focus</dt>
            <dd className="text-text">{event.focus ? 'Focus session' : 'Study session'}</dd>
          </div>
        )}
      </dl>

      {footer === 'prompt' ? (
        <div className="mt-6">
          <WeeklyChoicePrompt
            question={REMOVE_PROMPT}
            onThisDay={() => void remove('this-day')}
            onFollowing={() => void remove('following')}
            onBack={backToIdle}
            busy={isDeleting}
          />
        </div>
      ) : footer === 'confirm' ? (
        <div
          className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end"
          data-testid="details-confirm"
        >
          <span className="text-body-sm text-text sm:mr-auto">Remove this?</span>
          <Button
            ref={noRef}
            type="button"
            variant="outline"
            onClick={backToIdle}
            disabled={isDeleting}
            className="max-sm:min-h-[44px]"
          >
            No
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void remove('all')}
            isLoading={isDeleting}
            aria-label="Yes, remove"
            data-dialog-commit
            className="max-sm:min-h-[44px]"
          >
            Yes, remove
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {showActions && onDelete && (
            <Button
              ref={removeRef}
              type="button"
              variant="ghost"
              leftIcon={<Trash2 size={16} />}
              onClick={() => setFooter(event.recurring ? 'prompt' : 'confirm')}
              className="mr-auto text-danger hover:text-danger max-sm:min-h-[44px]"
            >
              Remove
            </Button>
          )}
          {(actions || (showActions && onEdit)) && (
            <div data-testid="details-actions" className="flex items-center gap-2">
              {actions}
              {showActions && onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<Pencil size={16} />}
                  onClick={onEdit}
                  className="max-sm:min-h-[44px]"
                >
                  Edit
                </Button>
              )}
            </div>
          )}
          <Button type="button" variant="outline" onClick={onClose} className="max-sm:min-h-[44px]">
            Close
          </Button>
        </div>
      )}
    </Dialog>
  );
}
