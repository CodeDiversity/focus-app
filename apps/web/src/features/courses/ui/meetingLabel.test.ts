import { describe, it, expect } from 'vitest';
import { formatMeetingLabel } from './meetingLabel';

describe('formatMeetingLabel (D112B-7)', () => {
  it('renders "Mon 09:00–10:30" — short weekday, en dash, 24-hour times exactly as stored', () => {
    expect(formatMeetingLabel({ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' })).toBe(
      'Mon 09:00–10:30'
    );
  });

  it('maps every dayOfWeek 0–6 to the short weekday (Sunday=0 … Saturday=6, D112-1)', () => {
    const expected = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    expected.forEach((day, index) => {
      expect(formatMeetingLabel({ dayOfWeek: index, startTime: '08:00', endTime: '09:00' })).toBe(
        `${day} 08:00–09:00`
      );
    });
  });

  it('never converts time zones (the stored HH:mm is the recurring time of day)', () => {
    expect(formatMeetingLabel({ dayOfWeek: 6, startTime: '23:00', endTime: '23:59' })).toBe(
      'Sat 23:00–23:59'
    );
  });
});
