import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalibrationNote } from './CalibrationNote';
import {
  calibrationSentence,
  distinctCalibrations,
} from '@/features/study-plan/lib/calibrationCopy';

/**
 * EP13L-AC4 — the annotation renders the explanation neutrally and
 * accessibly; the copy is the ratified sentence (D-L4) and never shames
 * (D13-9).
 */
describe('CalibrationNote (EP13L)', () => {
  it('renders the ratified sentence for one multiplier', () => {
    render(
      <CalibrationNote calibration={[{ assignmentType: 'PAPER', multiplier: 1.6, samples: 4 }]} />
    );
    const note = screen.getByRole('note', { name: 'How your estimates were adjusted' });
    expect(note).toHaveTextContent(
      'Your papers usually take about 1.6× your estimate, so we planned for that.'
    );
  });

  it('uses "assignments" for the overall fallback and pluralises each type', () => {
    expect(calibrationSentence({ assignmentType: null, multiplier: 2, samples: 3 })).toBe(
      'Your assignments usually take about 2.0× your estimate, so we planned for that.'
    );
    expect(calibrationSentence({ assignmentType: 'QUIZ', multiplier: 0.8, samples: 3 })).toBe(
      'Your quizzes usually take about 0.8× your estimate, so we planned for that.'
    );
    expect(calibrationSentence({ assignmentType: 'HOMEWORK', multiplier: 1.25, samples: 3 })).toBe(
      'Your homework assignments usually take about 1.3× your estimate, so we planned for that.'
    );
  });

  it('lists one sentence per multiplier when several apply', () => {
    render(
      <CalibrationNote
        calibration={[
          { assignmentType: 'PAPER', multiplier: 1.6, samples: 4 },
          { assignmentType: 'PROJECT', multiplier: 2.1, samples: 3 },
        ]}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/Your papers usually take about 1\.6×/);
    expect(items[1]).toHaveTextContent(/Your projects usually take about 2\.1×/);
  });

  it('renders nothing for an uncalibrated student (no annotation noise)', () => {
    const { container } = render(<CalibrationNote calibration={[]} />);
    expect(container).toBeEmptyDOMElement();
    const { container: missing } = render(<CalibrationNote />);
    expect(missing).toBeEmptyDOMElement();
  });

  it('never uses shaming framing (D13-9)', () => {
    for (const annotation of [
      { assignmentType: 'PAPER', multiplier: 1.6, samples: 4 },
      { assignmentType: null, multiplier: 3, samples: 9 },
      { assignmentType: 'EXAM', multiplier: 0.5, samples: 3 },
    ]) {
      const text = calibrationSentence(annotation).toLowerCase();
      expect(text).not.toMatch(/underestimat|overestimat|wrong|behind|late|fail|bad|should/);
      expect(text).toMatch(/so we planned for that\.$/);
    }
  });

  it('derives one annotation per figure from remaining-work rows, in a stable order', () => {
    const paper = { assignmentType: 'PAPER', multiplier: 1.6, samples: 4 };
    const overall = { assignmentType: null, multiplier: 1.2, samples: 5 };
    expect(
      distinctCalibrations([
        { calibration: paper },
        { calibration: null },
        { calibration: overall },
        { calibration: paper },
      ])
    ).toEqual([overall, paper]);
  });
});
