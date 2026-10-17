// Shared IANA time zone-aware date/time formatting helpers.
// Stub per TECH-01 (STUDY-20): consumed by SP-106 (profile preferences),
// EP04 (calendar), and EP05 (dashboard). Extend this module — do not fork it.

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function formatDate(date: Date, timeZone: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(date);
}

export function formatTime(date: Date, timeZone: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(date);
}

export function formatDateTime(date: Date, timeZone: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}
