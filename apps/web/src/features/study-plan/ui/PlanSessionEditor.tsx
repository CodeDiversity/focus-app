import { useCallback, useState } from 'react';
import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import type { ProposedSession, PlanConflict } from '@/entities/study-plan/model/types';
import { CONFLICT_REASON_LABEL } from '@/entities/study-plan/model/types';
import {
  sessionTimeLabel,
  windowHintFromStart,
} from '@/entities/study-plan/model/sessionTimeLabel';

export interface PlanSessionEditorProps {
  sessions: ProposedSession[];
  days: string[];
  onChange: (sessions: ProposedSession[]) => void;
  /**
   * 409 confirm conflicts to mark (EP08E, decision 11): rows whose
   * `sessionIndex` matches the row index get `border-danger` plus the
   * textual reason. Absent/empty keeps the markup byte-identical (EP06).
   */
  conflicts?: PlanConflict[];
  /** Optional extra class names. */
  className?: string;
}

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

export function PlanSessionEditor({
  sessions,
  days,
  onChange,
  conflicts,
  className,
}: PlanSessionEditorProps) {
  const dayOptions = days.map((d) => ({ value: d, label: d }));
  const [announcement, setAnnouncement] = useState('');

  const updateAt = useCallback(
    (index: number, patch: Partial<ProposedSession>) => {
      const next = sessions.map((s, i) => (i === index ? { ...s, ...patch } : s));
      onChange(next);
    },
    [sessions, onChange]
  );

  const removeAt = useCallback(
    (index: number) => {
      const removed = sessions[index];
      if (!removed) return;
      const next = sessions.filter((_, i) => i !== index);
      onChange(next);
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Session deleted.</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
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
      const pad = (n: number) =>
        String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
      // EP13H (D-H5): choosing when it starts is the clock commitment — a
      // moved flex session pins. Duration changes (resize) deliberately
      // don't.
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
      const pad = (n: number) =>
        String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
      const newDuration = end - minutesOf(s.startTime);
      updateAt(index, { endTime: pad(end), durationMinutes: newDuration });
    },
    [sessions, updateAt]
  );

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-text-muted" data-testid="editor-empty">
        No sessions to edit.
      </p>
    );
  }

  return (
    <div className={className} data-testid="plan-session-editor">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {/* EP13H (D-H3): one shared explanation — the contract stores no
          per-session pin provenance, so the editor explains the category. */}
      <p className="mb-3 text-xs text-text-muted">
        Flexible sessions belong to their day — start them anytime. Fixed-time sessions keep their
        slot — usually because a deadline is close, or you picked the time yourself.
      </p>
      {sessions.map((s, i) => {
        const rowConflicts = (conflicts ?? []).filter((c) => c.sessionIndex === i);
        return (
          <article
            key={`${s.assignmentId}-${i}-${s.date}`}
            aria-label={`${s.assignmentTitle}, ${s.startTime} to ${s.endTime}`}
            className={`mb-3 rounded-md border ${
              rowConflicts.length > 0 ? 'border-danger' : 'border-border'
            } bg-surface p-3`}
            data-conflicted={rowConflicts.length > 0 || undefined}
          >
            <p className="font-medium text-text">{s.assignmentTitle}</p>
            <p className="text-xs text-text-muted">
              {sessionTimeLabel({
                anchor: s.anchor,
                windowHint: s.windowHint,
                timeRange: `${s.startTime} – ${s.endTime}`,
                durationMinutes: s.durationMinutes,
              })}
            </p>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select
                label="Day"
                value={s.date}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateAt(i, { date: e.target.value })
                }
                aria-label="Day"
              >
                {dayOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
                  const pad = (n: number) =>
                    String(Math.floor(n / 60)).padStart(2, '0') +
                    ':' +
                    String(n % 60).padStart(2, '0');
                  // EP13H (D-H5): typing a start time pins a flex session.
                  const pin =
                    s.anchor === 'FLEX_DAY' ? { anchor: 'FIXED' as const, windowHint: null } : {};
                  updateAt(i, { startTime: v, endTime: pad(newEnd), ...pin });
                  if (s.anchor === 'FLEX_DAY') {
                    setAnnouncement(`${s.assignmentTitle} pinned to ${v} — you chose a time`);
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
                  updateAt(i, {
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
                onClick={() => moveBy(i, -15)}
                aria-label="Move earlier 15 minutes"
              >
                Move earlier
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => moveBy(i, 15)}
                aria-label="Move later 15 minutes"
              >
                Move later
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => resizeBy(i, -15)}
                aria-label="Shorten 15 minutes"
              >
                Shorten
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => resizeBy(i, 15)}
                aria-label="Lengthen 15 minutes"
              >
                Lengthen
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeAt(i)}
                aria-label="Delete session"
              >
                Delete
              </Button>
              {/* EP13H (D-H4): the pin/unpin toggle — two labelled actions,
                  not a switch. Unpinning derives the hint from the suggested
                  start so it can never disagree with the slot (D-H6). */}
              {s.anchor === 'FLEX_DAY' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateAt(i, { anchor: 'FIXED', windowHint: null });
                    setAnnouncement(`${s.assignmentTitle} pinned to ${s.startTime}`);
                  }}
                  aria-label={`Pin ${s.assignmentTitle} to ${s.startTime}`}
                >
                  Pin to this time
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateAt(i, {
                      anchor: 'FLEX_DAY',
                      windowHint: windowHintFromStart(s.startTime),
                    });
                    setAnnouncement(
                      `${s.assignmentTitle} made flexible — start it anytime that day`
                    );
                  }}
                  aria-label={`Make ${s.assignmentTitle} flexible`}
                >
                  Make flexible
                </Button>
              )}
            </div>
            {rowConflicts.length > 0 ? (
              <p className="mt-2 text-xs text-danger">
                {rowConflicts.map((c) => CONFLICT_REASON_LABEL[c.reason] ?? c.reason).join(' · ')}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default PlanSessionEditor;
