import { describe, it, expect } from 'vitest';
import { findForbiddenWords, expectNoForbiddenWords } from './forbiddenWords';

const el = (html: string) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
};

describe('forbiddenWords (EP16B-AC5, D-B8)', () => {
  it('flags each forbidden word as a whole word, case-insensitively', () => {
    for (const w of ['Missed', 'behind', 'OVERDUE', 'failed', 'Late']) {
      expect(findForbiddenWords(el(`<p>You are ${w} today</p>`))).toEqual([w]);
    }
  });

  it('flags a % character', () => {
    expect(findForbiddenWords(el('<p>80% done</p>'))).toEqual(['%']);
  });

  it('allows "Past due", "Moved forward", "Set aside"', () => {
    expectNoForbiddenWords(el('<p>Past due · Moved forward · Set aside</p>'));
  });

  it('does not flag "later" or "Move later" (whole-word match)', () => {
    expectNoForbiddenWords(el('<p>Move later — continues in a later plan</p>'));
  });

  it('reads aria-label, title and alt attributes as well as text', () => {
    expect(findForbiddenWords(el('<button aria-label="Mark as missed">x</button>'))).toEqual([
      'missed',
    ]);
    expect(findForbiddenWords(el('<img alt="behind schedule" />'))).toEqual(['behind']);
    expect(findForbiddenWords(el('<span title="overdue">!</span>'))).toEqual(['overdue']);
  });
});
