import { expect } from 'vitest';

/**
 * EP16B (D-B8; contracts § Copy rules; D13-9) — the words no EP16 surface may
 * show a student. Whole-word, case-insensitive; "Past due", "Moved forward"
 * and "Set aside" are the allowed phrasings. The `%` character is forbidden
 * outright (no compliance percentages anywhere).
 */
export const FORBIDDEN_WORDS = ['missed', 'behind', 'overdue', 'failed', 'late'] as const;

const WORD_PATTERN = new RegExp(`\\b(${FORBIDDEN_WORDS.join('|')})\\b`, 'i');

/** Every string a screen reader or a sighted student can receive from `container`. */
export function renderedStrings(container: HTMLElement): string[] {
  const out: string[] = [container.textContent ?? ''];
  for (const el of Array.from(container.querySelectorAll('[aria-label], [title], [alt]'))) {
    for (const attr of ['aria-label', 'title', 'alt']) {
      const v = el.getAttribute(attr);
      if (v) out.push(v);
    }
  }
  return out;
}

/** The offending fragments, or an empty list when the container is clean. */
export function findForbiddenWords(container: HTMLElement): string[] {
  const hits: string[] = [];
  for (const text of renderedStrings(container)) {
    const m = text.match(WORD_PATTERN);
    if (m) hits.push(m[0]);
    if (text.includes('%')) hits.push('%');
  }
  return hits;
}

export function expectNoForbiddenWords(container: HTMLElement): void {
  expect(findForbiddenWords(container)).toEqual([]);
}
