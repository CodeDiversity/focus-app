import { describe, it, expect } from 'vitest';
import { formatSlotLabel, formatSlotName, slotKindLabel } from './slotLabel';

/** A Monday 09:00–10:30 slot (the `meetingLabel` convention's example, D128B-4). */
const mondayMorning = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:30',
};

describe('formatSlotLabel', () => {
  it('renders "Mon 09:00–10:30" from dayOfWeek 1 with an en dash (the meetingLabel convention; Sunday=0 … Saturday=6)', () => {
    expect(formatSlotLabel(mondayMorning)).toBe('Mon 09:00–10:30');
  });

  it('covers the Sunday–Saturday short names from dayOfWeek 0–6', () => {
    const times = { startTime: '08:00', endTime: '09:00' };
    expect(formatSlotLabel({ ...times, dayOfWeek: 0 })).toBe('Sun 08:00–09:00');
    expect(formatSlotLabel({ ...times, dayOfWeek: 2 })).toBe('Tue 08:00–09:00');
    expect(formatSlotLabel({ ...times, dayOfWeek: 3 })).toBe('Wed 08:00–09:00');
    expect(formatSlotLabel({ ...times, dayOfWeek: 4 })).toBe('Thu 08:00–09:00');
    expect(formatSlotLabel({ ...times, dayOfWeek: 5 })).toBe('Fri 08:00–09:00');
    expect(formatSlotLabel({ ...times, dayOfWeek: 6 })).toBe('Sat 08:00–09:00');
  });

  it('keeps the stored 24-hour HH:mm text exactly (no reformatting, no time-zone conversion)', () => {
    expect(formatSlotLabel({ dayOfWeek: 5, startTime: '00:15', endTime: '23:59' })).toBe(
      'Fri 00:15–23:59'
    );
  });

  it('does not depend on the kind — the label is only the time range (same label for both kinds)', () => {
    expect(formatSlotLabel(mondayMorning)).toBe('Mon 09:00–10:30');
    expect(formatSlotName({ ...mondayMorning, isAvailable: false })).toBe(
      'Blocked Mon 09:00–10:30'
    );
    // The time range within the full name stays the same.
    expect(formatSlotName({ ...mondayMorning, isAvailable: false })).toContain(' Mon 09:00–10:30');
  });
});

describe('formatSlotName (kind + label — D128B-4)', () => {
  it('puts the kind label before the time range', () => {
    expect(formatSlotName({ ...mondayMorning, isAvailable: true })).toBe(
      'Available Mon 09:00–10:30'
    );
    expect(formatSlotName({ ...mondayMorning, isAvailable: false })).toBe(
      'Blocked Mon 09:00–10:30'
    );
  });

  it('makes identical times of different kinds distinct in the accessibility tree', () => {
    const available = formatSlotName({ ...mondayMorning, isAvailable: true });
    const blocked = formatSlotName({ ...mondayMorning, isAvailable: false });
    expect(available).not.toEqual(blocked);
    expect(available).toContain('Available');
    expect(blocked).toContain('Blocked');
  });
});

describe('slotKindLabel (the CalendarEventChip vocabulary verbatim, D127B-5)', () => {
  it('maps isAvailable true → "Available" and false → "Blocked"', () => {
    expect(slotKindLabel(true)).toBe('Available');
    expect(slotKindLabel(false)).toBe('Blocked');
  });
});
