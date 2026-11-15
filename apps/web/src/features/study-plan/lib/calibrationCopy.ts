import type { CalibrationAnnotation } from '@/entities/study-plan/model/types';

/**
 * EP13L — the one student-facing sentence behind a calibrated plan (D-L4,
 * ratified copy). Neutral by design (D13-9): it describes what the app did
 * with the student's own history, never what the student "gets wrong".
 */

/** The plural noun for each closed `Assignment.type`; `null` = all finished work. */
const TYPE_PLURAL: Record<string, string> = {
  HOMEWORK: 'homework assignments',
  PAPER: 'papers',
  PROJECT: 'projects',
  QUIZ: 'quizzes',
  EXAM: 'exams',
};

export function assignmentTypePlural(assignmentType: string | null): string {
  if (assignmentType === null) return 'assignments';
  return TYPE_PLURAL[assignmentType] ?? `${assignmentType.toLowerCase()} assignments`;
}

/** `1.6` → `1.6×`; `2` → `2.0×`. */
export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(1)}×`;
}

/** "Your papers usually take about 1.6× your estimate, so we planned for that." */
export function calibrationSentence(annotation: CalibrationAnnotation): string {
  return `Your ${assignmentTypePlural(annotation.assignmentType)} usually take about ${formatMultiplier(
    annotation.multiplier
  )} your estimate, so we planned for that.`;
}

/**
 * The distinct annotations behind a list of items (one per figure), in a
 * stable order — the remaining-work section derives its note from its rows.
 */
export function distinctCalibrations(
  items: ReadonlyArray<{ calibration?: CalibrationAnnotation | null }>
): CalibrationAnnotation[] {
  const byKey = new Map<string, CalibrationAnnotation>();
  for (const item of items) {
    if (item.calibration) byKey.set(item.calibration.assignmentType ?? '', item.calibration);
  }
  return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}
