import { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getBrowserTimeZone, formatDate } from '@/shared/lib/datetime';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';
import type { AssignmentListItem } from '@/shared/types/academic';

export interface FocusAssignmentPanelProps {
  assignmentId: string | null;
}

export function FocusAssignmentPanel({ assignmentId }: FocusAssignmentPanelProps) {
  const [assignment, setAssignment] = useState<AssignmentListItem | null>(null);
  const [loading, setLoading] = useState<boolean>(!!assignmentId);
  const [resolved, setResolved] = useState<boolean>(!assignmentId);

  useEffect(() => {
    if (!assignmentId) {
      setAssignment(null);
      setLoading(false);
      setResolved(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setResolved(false);
    listAssignments()
      .then((list) => {
        if (cancelled) return;
        setAssignment(list.find((a) => a.id === assignmentId) ?? null);
        setLoading(false);
        setResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAssignment(null);
        setLoading(false);
        setResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const timeZone = getBrowserTimeZone();
  const doneCount = assignment?.subtasks.filter((s) => s.status === 'COMPLETED').length ?? 0;
  const totalCount = assignment?.subtasks.length ?? 0;

  return (
    <Card variant="outlined" padding="md">
      <h2 className="text-h3 text-text mb-3">Assignment and subtasks</h2>
      {loading && (
        <p className="text-body-sm text-text-muted" aria-busy="true">
          Loading assignment…
        </p>
      )}
      {!loading && (!assignmentId || !assignment) && (
        <EmptyState
          title="No assignment linked to this session"
          description="This session isn't tied to an assignment."
        />
      )}
      {!loading && assignment && (
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-text">{assignment.title}</p>
            <p className="text-body-sm text-text-muted">
              {assignment.course && <span className="mr-1">{assignment.course.name} ·</span>}
              Due{' '}
              {assignment.dueDate
                ? formatDate(new Date(assignment.dueDate), timeZone)
                : 'No due date'}
              {assignment.estimatedHours != null && ` · ${assignment.estimatedHours}h estimated`}
            </p>
          </div>
          <p className="text-body-sm text-text-muted">
            {totalCount === 0 ? 'No subtasks' : `Subtasks · ${doneCount} of ${totalCount} done`}
          </p>
          {totalCount > 0 && (
            <ul className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {assignment.subtasks.map((s) => {
                const isDone = s.status === 'COMPLETED';
                return (
                  <li
                    key={s.id}
                    className={
                      isDone
                        ? 'flex items-center gap-2 text-body-sm line-through text-text-muted'
                        : 'flex items-center gap-2 text-body-sm text-text'
                    }
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} aria-hidden />
                    ) : (
                      <Circle size={16} aria-hidden />
                    )}
                    <span>{s.title}</span>
                    <span className="ml-auto text-caption text-text-muted">
                      {isDone ? 'Done' : 'To do'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {!resolved && null}
    </Card>
  );
}
