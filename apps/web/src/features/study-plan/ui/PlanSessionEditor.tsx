import { useCallback, useState } from 'react';
import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import type { ProposedSession } from '@/entities/study-plan/model/types';

export interface PlanSessionEditorProps {
  sessions: ProposedSession[];
  days: string[];
  onChange: (sessions: ProposedSession[]) => void;
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

export function PlanSessionEditor({ sessions, days, onChange, className }: PlanSessionEditorProps) {
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
      updateAt(index, { startTime: pad(start), endTime: pad(end) });
      setAnnouncement(`${s.assignmentTitle} moved to ${pad(start)} to ${pad(end)}`);
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
      {sessions.map((s, i) => (
        <article
          key={`${s.assignmentId}-${i}-${s.date}`}
          aria-label={`${s.assignmentTitle}, ${s.startTime} to ${s.endTime}`}
          className="mb-3 rounded-md border border-border bg-surface p-3"
        >
          <p className="font-medium text-text">{s.assignmentTitle}</p>
          <p className="text-xs text-text-muted">
            {s.startTime} – {s.endTime} ({s.durationMinutes} min)
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
                updateAt(i, { startTime: v, endTime: pad(newEnd) });
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
                updateAt(i, { endTime: v, durationMinutes: minutesOf(v) - minutesOf(s.startTime) });
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
          </div>
        </article>
      ))}
    </div>
  );
}

export default PlanSessionEditor;
