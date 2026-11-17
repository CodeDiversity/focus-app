import { describe, expect, it } from 'vitest';
import { MIDNIGHT_HELPER, minutesOfTime, toApiEndTime, toInputEndTime } from './midnight';

describe('midnight mapping (EP15F D-G6 / R-EP15-11)', () => {
  it('maps 00:00 → 24:00 for the API and back for the input; other values pass through', () => {
    expect(toApiEndTime('00:00')).toBe('24:00');
    expect(toApiEndTime('23:00')).toBe('23:00');
    expect(toInputEndTime('24:00')).toBe('00:00');
    expect(toInputEndTime('23:00')).toBe('23:00');
    expect(MIDNIGHT_HELPER).toBe('00:00 means midnight');
  });
  it('minutesOfTime mirrors the API bounds', () => {
    expect(minutesOfTime('24:00')).toBe(1440);
    expect(minutesOfTime('24:01')).toBeNull();
    expect(minutesOfTime('9:00')).toBeNull();
    expect(minutesOfTime('07:30')).toBe(450);
  });
});
