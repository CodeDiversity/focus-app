import * as React from 'react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import type { PlanConflict, ProposedSession } from '@/entities/study-plan/model/types';
import { CONFLICT_REASON_LABEL } from '@/entities/study-plan/model/types';
import {
  sessionTimeLabel,
  windowHintFromStart,
} from '@/entities/study-plan/model/sessionTimeLabel';
import { dayLabel } from '@/features/study-plan/lib/dayLabel';

/**
 * EP17E (▲ D17-4, ▲ D-E1 (a)) — one proposed session, edited where it is
 * drawn. The card's first element is a disclosure button (the session's title
 * and time label, `aria-expanded`/`aria-controls`); the editing panel carries
 * the exact controls `PlanSessionEditor` shipped — reviewed accessible names
 * included (F-EP16C-01, WCAG 2.5.3) — and is rendered by `EditableWeek` as a
 * grid sibling so it can span the full width at `md`+ (D-E6).
 */

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function clampTime(v: string): string {
  if (!/^\d{2}:\d{2}$/.test(v)) return v;
  const m = minutesOf(v);
  if (m < 0) return '00:00';
  if (m > 23 * 60 + 59) return '23:59';
  return v;
}

const pad = (n: number) =>
  String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');

export function panelIdFor(index: number): string {
  return `editable-session-panel-${index}`;
}

export interface EditableSessionCardProps {
  session: ProposedSession;
  /** Flat index into the edited list — the session's identity (EP17E). */
  index: number;
  open: boolean;
  conflicts: PlanConflict[];
  onToggle: (index: number) => void;
  buttonRef: (index: number, el: HTMLButtonElement | null) => void;
}

/** The collapsed card: the disclosure button plus the conflict/selected marks. */
export function EditableSessionCard({
  session: s,
  index,
  open,
  conflicts,
  onToggle,
  buttonRef,
}: EditableSessionCardProps) {
  const conflicted = conflicts.length > 0;
  return (
    <article
      data-session-index={index}
      data-conflicted={conflicted || undefined}
      className={`rounded-md border ${conflicted ? 'border-danger' : 'border-border'} ${
        open ? 'ring-2 ring-accent' : ''
      } bg-surface p-2`}
    >
      <button
        type="button"
        ref={(el) => buttonRef(index, el)}
        aria-expanded={open}
        // Only while open: an `aria-controls` naming an unrendered id is an
        // axe `aria-valid-attr-value` violation, and the panel mounts on open.
        aria-controls={open ? panelIdFor(index) : undefined}
        onClick={() => onToggle(index)}
        className="block w-full rounded-md text-left text-xs max-sm:min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <p className="font-medium text-text">{s.assignmentTitle}</p>
        <p className="text-text-muted">
          {sessionTimeLabel({
            anchor: s.anchor,
            windowHint: s.windowHint,
            timeRange: `${s.startTime} – ${s.endTime}`,
            durationMinutes: s.durationMinutes,
          })}
        </p>
      </button>
      {/* Selected state: ring AND text — never colour alone (AC-E17-13). */}
      {open ? <p className="mt-1 text-xs font-medium text-accent">Editing</p> : null}
      {/* Conflict: border AND text — never colour alone (EP17E-AC6). */}
      {conflicted ? (
        <p className="mt-1 text-xs text-danger">
          {conflicts.map((c) => CONFLICT_REASON_LABEL[c.reason] ?? c.reason).join(' · ')}
        </p>
      ) : null}
    </article>
  );
}

export interface SessionEditorPanelProps {
  session: ProposedSession;
  index: number;
  days: string[];
  onUpdate: (index: number, patch: Partial<ProposedSession>) => void;
  onChangeDay: (index: number, date: string) => void;
  onMove: (index: number, deltaMinutes: number) => void;
  onResize: (index: number, deltaMinutes: number) => void;
  onDelete: (index: number) => void;
  onClose: () => void;
  announce: (message: string) => void;
  className?: string;
}

/**
 * The expanded editing panel — the controls, guards and announcements moved
 * verbatim from `PlanSessionEditor` (D-E8): `clampTime` bounds, the EP13H
 * D-H5 pin-on-move/pin-on-typed-start (resizing never pins), the D-H6
 * derived window hint, the toast-Undo delete (D-E3, D-E7) and the five
 * reviewed button labels. `Escape` closes it and returns focus to the
 * disclosure button (EP17E-AC2).
 */
export function SessionEditorPanel({
  session: s,
  index,
  days,
  onUpdate,
  onChangeDay,
  onMove,
  onResize,
  onDelete,
  onClose,
  announce,
  className,
}: SessionEditorPanelProps) {
  // Escape anywhere inside the panel closes it and returns focus to the
  // disclosure button (EP17E-AC2). A native listener on the panel node (the
  // Dialog.tsx pattern) — JSX keyboard handlers on a non-interactive element
  // trip jsx-a11y, and the controls inside stay untouched.
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  React.useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    node.addEventListener('keydown', handle);
    return () => node.removeEventListener('keydown', handle);
  }, []);

  return (
    <div
      ref={panelRef}
      id={panelIdFor(index)}
      data-testid="session-editor-panel"
      role="group"
      aria-label={`Edit ${s.assignmentTitle}`}
      className={`rounded-md border border-accent bg-surface p-3 md:order-last md:col-span-7 ${
        className ?? ''
      }`}
    >
      <p className="font-medium text-text">{s.assignmentTitle}</p>
      {/* EP13H (D-H3): one shared explanation — the contract stores no
          per-session pin provenance, so the editor explains the category. */}
      <p className="mt-1 text-xs text-text-muted">
        Flexible sessions belong to their day — start them anytime. Fixed-time sessions keep their
        slot — usually because a deadline is close, or you picked the time yourself.
      </p>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          label="Day"
          value={s.date}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChangeDay(index, e.target.value)}
          aria-label="Day"
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </Select>
        <Input
          label="Start time"
          type="time"
          value={s.startTime}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = clampTime(e.target.value);
            const mins = minutesOf(v);
            const dur = minutesOf(s.endTime) - minutesOf(s.startTime);
            const newEnd = mins + dur;
            if (newEnd > 24 * 60) return;
            // EP13H (D-H5): typing a start time pins a flex session.
            const pin =
              s.anchor === 'FLEX_DAY' ? { anchor: 'FIXED' as const, windowHint: null } : {};
            onUpdate(index, { startTime: v, endTime: pad(newEnd), ...pin });
            if (s.anchor === 'FLEX_DAY') {
              announce(`${s.assignmentTitle} pinned to ${v} — you chose a time`);
            }
          }}
          aria-label="Start time"
        />
        <Input
          label="End time"
          type="time"
          value={s.endTime}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = clampTime(e.target.value);
            if (minutesOf(v) <= minutesOf(s.startTime)) return;
            onUpdate(index, {
              endTime: v,
              durationMinutes: minutesOf(v) - minutesOf(s.startTime),
            });
          }}
          aria-label="End time"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onMove(index, -15)}
          aria-label="Move earlier 15 minutes"
        >
          Move earlier
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onMove(index, 15)}
          aria-label="Move later 15 minutes"
        >
          Move later
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onResize(index, -15)}
          aria-label="Shorten 15 minutes"
        >
          Shorten
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onResize(index, 15)}
          aria-label="Lengthen 15 minutes"
        >
          Lengthen
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => onDelete(index)}
          aria-label="Delete session"
        >
          Delete
        </Button>
        {/* EP13H (D-H4): the pin/unpin toggle — two labelled actions, not a
            switch. EP16C (F-EP16C-01, WCAG 2.5.3): the accessible name starts
            with the visible text so voice control matches. Unpinning derives
            the hint from the suggested start so it can never disagree with
            the slot (D-H6). */}
        {s.anchor === 'FLEX_DAY' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onUpdate(index, { anchor: 'FIXED', windowHint: null });
              announce(`${s.assignmentTitle} pinned to ${s.startTime}`);
            }}
            aria-label={`Pin to this time: ${s.assignmentTitle}, ${s.startTime}`}
          >
            Pin to this time
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onUpdate(index, {
                anchor: 'FLEX_DAY',
                windowHint: windowHintFromStart(s.startTime),
              });
              announce(`${s.assignmentTitle} made flexible — start it anytime that day`);
            }}
            aria-label={`Make flexible: ${s.assignmentTitle}`}
          >
            Make flexible
          </Button>
        )}
      </div>
    </div>
  );
}
