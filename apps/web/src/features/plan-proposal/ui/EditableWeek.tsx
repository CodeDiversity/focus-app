import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { PlanConflict, ProposedSession } from '@/entities/study-plan/model/types';
import { dayLabel } from '@/features/study-plan/lib/dayLabel';
import { EditableSessionCard, SessionEditorPanel } from './EditableSessionCard';

/**
 * EP17E (▲ D17-4, AC-E17-09) — the proposed week, rendered once and edited in
 * place. The **single** consumer of `useProposal`'s `edited` list: it groups
 * the flat list by `date` for rendering only, keeps the flat index as each
 * card's identity (`conflicts[].sessionIndex` indexes the flat array), and
 * holds at most one open editing panel (`openIndex`).
 *
 * Layout (D-E6): `grid grid-cols-1 gap-2 md:grid-cols-7`. The open panel is a
 * grid sibling rendered directly after its day section — below `md` that puts
 * it under its own day; at `md`+ `md:order-last md:col-span-7` moves it to a
 * full-width row below the seven columns.
 *
 * One polite live region per surface — not one per card.
 */

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const pad = (n: number) =>
  String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');

type FocusRequest = { kind: 'button'; index: number } | { kind: 'heading'; date: string };

export interface EditableWeekProps {
  /** The flat edited list — `useProposal`'s `edited`, order preserved. */
  sessions: ProposedSession[];
  /** The window's dates (YYYY-MM-DD), in order. */
  days: string[];
  onChange: (sessions: ProposedSession[]) => void;
  /** 409 confirm conflicts: `sessionIndex` indexes the flat `sessions` list. */
  conflicts?: PlanConflict[];
  /** The plan's zone — named in the group label only (the week line explains it). */
  timeZone?: string;
  className?: string;
}

export function EditableWeek({
  sessions,
  days,
  onChange,
  conflicts,
  timeZone,
  className,
}: EditableWeekProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const buttonRefs = useRef(new Map<number, HTMLButtonElement>());
  const headingRefs = useRef(new Map<string, HTMLHeadingElement>());
  const focusRequest = useRef<FocusRequest | null>(null);

  // EP17E-AC6: a conflicted session's panel is open on arrival.
  const firstConflicted = conflicts && conflicts.length > 0 ? conflicts[0].sessionIndex : null;
  useEffect(() => {
    if (firstConflicted !== null) setOpenIndex(firstConflicted);
  }, [firstConflicted]);

  // EP17E-AC3/AC4: focus moves after React commits — the element focused
  // synchronously would be unmounted or relocated by the time it does.
  useEffect(() => {
    const req = focusRequest.current;
    if (!req) return;
    focusRequest.current = null;
    if (req.kind === 'button') buttonRefs.current.get(req.index)?.focus();
    else headingRefs.current.get(req.date)?.focus();
  });

  const setButtonRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    if (el) buttonRefs.current.set(index, el);
    else buttonRefs.current.delete(index);
  }, []);

  const updateAt = useCallback(
    (index: number, patch: Partial<ProposedSession>) => {
      onChange(sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    },
    [sessions, onChange]
  );

  /** Day change (EP17E-AC3): the card moves columns, stays open, refocuses. */
  const changeDay = useCallback(
    (index: number, date: string) => {
      const s = sessions[index];
      if (!s || s.date === date) return;
      updateAt(index, { date });
      setAnnouncement(`${s.assignmentTitle} moved to ${dayLabel(date)}`);
      focusRequest.current = { kind: 'button', index };
    },
    [sessions, updateAt]
  );

  /** Delete with toast-Undo (D-E3, D-E7) and the EP17E-AC4 focus contract. */
  const removeAt = useCallback(
    (index: number) => {
      const removed = sessions[index];
      if (!removed) return;
      const next = sessions.filter((_, i) => i !== index);
      // Compute the focus target before onChange: the card that takes the
      // removed card's place in its day, else the last card left in the day,
      // else the day heading (tabIndex -1). Never document.body.
      const sameDay = next
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.date === removed.date)
        .map(({ i }) => i);
      const slot = sessions.filter((s, i) => s.date === removed.date && i < index).length;
      if (sameDay.length > 0) {
        focusRequest.current = {
          kind: 'button',
          index: sameDay[Math.min(slot, sameDay.length - 1)],
        };
      } else {
        focusRequest.current = { kind: 'heading', date: removed.date };
      }
      setOpenIndex(null);
      onChange(next);
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Session deleted.</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                focusRequest.current = { kind: 'button', index };
                onChange([...next.slice(0, index), removed, ...next.slice(index)]);
                toast.dismiss(t.id);
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    },
    [sessions, onChange]
  );

  const moveBy = useCallback(
    (index: number, deltaMinutes: number) => {
      const s = sessions[index];
      if (!s) return;
      const start = minutesOf(s.startTime) + deltaMinutes;
      const end = minutesOf(s.endTime) + deltaMinutes;
      if (start < 0 || end > 24 * 60) return;
      // EP13H (D-H5): choosing when it starts is the clock commitment — a
      // moved flex session pins. Duration changes (resize) deliberately don't.
      const pin = s.anchor === 'FLEX_DAY' ? { anchor: 'FIXED' as const, windowHint: null } : {};
      updateAt(index, { startTime: pad(start), endTime: pad(end), ...pin });
      setAnnouncement(
        s.anchor === 'FLEX_DAY'
          ? `${s.assignmentTitle} pinned to ${pad(start)} — you chose a time`
          : `${s.assignmentTitle} moved to ${pad(start)} to ${pad(end)}`
      );
    },
    [sessions, updateAt]
  );

  const resizeBy = useCallback(
    (index: number, deltaMinutes: number) => {
      const s = sessions[index];
      if (!s) return;
      const end = minutesOf(s.endTime) + deltaMinutes;
      if (end <= minutesOf(s.startTime)) return;
      if (end > 24 * 60) return;
      updateAt(index, { endTime: pad(end), durationMinutes: end - minutesOf(s.startTime) });
    },
    [sessions, updateAt]
  );

  const closePanel = useCallback((index: number) => {
    setOpenIndex(null);
    focusRequest.current = { kind: 'button', index };
  }, []);

  const toggle = useCallback((index: number) => {
    setOpenIndex((cur) => (cur === index ? null : index));
  }, []);

  const conflictsFor = (index: number) => (conflicts ?? []).filter((c) => c.sessionIndex === index);

  return (
    <div className={className}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div
        role="group"
        aria-label={timeZone ? `Proposed week (${timeZone})` : 'Proposed week'}
        data-testid="editable-week"
        className="grid grid-cols-1 gap-2 md:grid-cols-7"
      >
        {days.map((date) => {
          const daySessions = sessions.map((s, i) => ({ s, i })).filter(({ s }) => s.date === date);
          const headingId = `editable-week-day-${date}`;
          const openHere =
            openIndex !== null && sessions[openIndex] && sessions[openIndex].date === date
              ? openIndex
              : null;
          return (
            // A fragment keyed by date: the section plus, when a session of
            // this day is open, its panel as the next grid item (D-E6).
            <Fragment key={date}>
              <section
                aria-labelledby={headingId}
                className="min-w-0 space-y-2 rounded-lg border border-border p-2"
              >
                <h3
                  id={headingId}
                  tabIndex={-1}
                  ref={(el) => {
                    if (el) headingRefs.current.set(date, el);
                    else headingRefs.current.delete(date);
                  }}
                  className="text-xs font-semibold text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {dayLabel(date)}
                </h3>
                {daySessions.length === 0 ? (
                  <p className="text-xs text-text-muted">No sessions</p>
                ) : (
                  daySessions.map(({ s, i }) => (
                    <EditableSessionCard
                      key={i}
                      session={s}
                      index={i}
                      open={openIndex === i}
                      conflicts={conflictsFor(i)}
                      onToggle={toggle}
                      buttonRef={setButtonRef}
                    />
                  ))
                )}
              </section>
              {openHere !== null ? (
                <SessionEditorPanel
                  session={sessions[openHere]}
                  index={openHere}
                  days={days}
                  onUpdate={updateAt}
                  onChangeDay={changeDay}
                  onMove={moveBy}
                  onResize={resizeBy}
                  onDelete={removeAt}
                  onClose={() => closePanel(openHere)}
                  announce={setAnnouncement}
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default EditableWeek;
