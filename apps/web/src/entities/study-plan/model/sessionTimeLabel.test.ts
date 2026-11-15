import { describe, it, expect } from 'vitest';
import { sessionTimeLabel, windowHintFromStart } from './sessionTimeLabel';

describe('sessionTimeLabel (EP13H, D-H1/D-H2)', () => {
  it('fixed → the clock range; flex → Anytime, never the suggested slot', () => {
    expect(
      sessionTimeLabel({
        anchor: 'FIXED',
        windowHint: null,
        timeRange: '9:00 – 10:00 AM',
        durationMinutes: 60,
      })
    ).toBe('9:00 – 10:00 AM · 60 min');

    const flex = sessionTimeLabel({
      anchor: 'FLEX_DAY',
      windowHint: 'EVENING',
      timeRange: '7:00 – 8:00 PM',
      durationMinutes: 60,
      anytimeWord: 'Anytime today',
    });
    expect(flex).toBe('Anytime today · 60 min · evening suggested');
    expect(flex).not.toContain('7:00');
  });

  it('a flex session without a hint has no suffix', () => {
    expect(
      sessionTimeLabel({
        anchor: 'FLEX_DAY',
        windowHint: null,
        timeRange: '7:00 – 8:00 PM',
        durationMinutes: 45,
      })
    ).toBe('Anytime · 45 min');
  });
});

describe('windowHintFromStart (EP13H, D-H6 — mirrors the engine mapping)', () => {
  it('keeps the 12:00 and 17:00 boundaries on the later side', () => {
    expect(windowHintFromStart('09:00')).toBe('MORNING');
    expect(windowHintFromStart('11:59')).toBe('MORNING');
    expect(windowHintFromStart('12:00')).toBe('AFTERNOON');
    expect(windowHintFromStart('16:59')).toBe('AFTERNOON');
    expect(windowHintFromStart('17:00')).toBe('EVENING');
    expect(windowHintFromStart('21:30')).toBe('EVENING');
  });
});
