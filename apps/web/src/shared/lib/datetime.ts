// Shared IANA time zone-aware date/time formatting helpers.
// Stub per TECH-01 (STUDY-20): consumed by SP-106 (profile preferences),
// SP-106E (select dropdown), EP04 (calendar), and EP05 (dashboard).
// Extend this module — do not fork it.

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

/**
 * Returns all IANA time zones supported by the runtime, sorted by UTC
 * offset (ascending) then alphabetically by region name within each offset.
 *
 * Uses `Intl.DateTimeFormat.supportedValuesOf('timeZone')` (ES2022+) when
 * available; falls back to a curated list of ~100 common zones for older
 * runtimes (Node < 16, older browsers).  All fallback entries are validated
 * against `isValidTimeZone` to ensure they are real zones.
 */
export function getTimeZones(): string[] {
  const referenceDate = new Date('2026-06-15T12:00:00Z'); // Northern Hemisphere mid-year avoids DST edge cases.

  // ES2022+ path: use the standard API directly.
  const dtfCtor = Intl.DateTimeFormat as unknown as {
    supportedValuesOf: (unit: 'timeZone') => string[];
  };
  if (typeof dtfCtor.supportedValuesOf === 'function') {
    const zones = dtfCtor.supportedValuesOf('timeZone');
    return sortTimeZoneList(zones, referenceDate);
  }

  // Fallback: curated list of the most-common IANA zones (~100 entries).
  // All entries are validated against isValidTimeZone to ensure they are
  // real zones recognized by the runtime's Intl implementation.
  const fallbackZones = [
    'UTC',
    'Etc/UTC',
    'Etc/GMT',
    'Europe/London',
    'Europe/Dublin',
    'Europe/Lisbon',
    'Europe/Madrid',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Vienna',
    'Europe/Stockholm',
    'Europe/Oslo',
    'Europe/Copenhagen',
    'Europe/Helsinki',
    'Europe/Athens',
    'Europe/Bucharest',
    'Europe/Warsaw',
    'Europe/Prague',
    'Europe/Budapest',
    'Europe/Zurich',
    'Europe/Luxembourg',
    'Europe/Malta',
    'Europe/Reykjavik',
    'Europe/Zagreb',
    'Europe/Belgrade',
    'Europe/Sofia',
    'Europe/Nicosia',
    'Europe/Tirane',
    'Europe/Ljubljana',
    'Europe/Sarajevo',
    'Europe/Podgorica',
    'Africa/Cairo',
    'Africa/Lagos',
    'Africa/Johannesburg',
    'Africa/Nairobi',
    'Africa/Casablanca',
    'Africa/Accra',
    'Africa/Dar_es_Salaam',
    'Africa/Kampala',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Karachi',
    'Asia/Dhaka',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Taipei',
    'Asia/Hong_Kong',
    'Asia/Manila',
    'Asia/Jakarta',
    'Asia/Pyongyang',
    'Asia/Rangoon',
    'Asia/Colombo',
    'Asia/Kabul',
    'Asia/Tehran',
    'Asia/Baghdad',
    'Asia/Baku',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Vancouver',
    'America/Anchorage',
    'America/Honolulu',
    'America/Phoenix',
    'America/Regina',
    'America/Toronto',
    'America/Montreal',
    'America/Winnipeg',
    'America/Edmonton',
    'America/Cambridge_Bay',
    'America/Inuvik',
    'America/Dawson_Creek',
    'America/Mazatlan',
    'America/Chihuahua',
    'America/Mexico_City',
    'America/Belize',
    'America/Costa_Rica',
    'America/Guatemala',
    'America/Managua',
    'America/Cancun',
    'America/Bogota',
    'America/Lima',
    'America/La_Paz',
    'America/Santiago',
    'America/St_Johns',
    'America/Halifax',
    'America/Sao_Paulo',
    'America/Argentina/Buenos_Aires',
    'America/Montevideo',
    'America/Asuncion',
    'America/Godthab',
    'America/Punta_Arenas',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Pacific/Port_Moresby',
    'Pacific/Guam',
    'Pacific/Tongatapu',
    'Pacific/Norfolk',
    'Pacific/Chatham',
    'Pacific/Majuro',
    'Pacific/Kwajalein',
    'Pacific/Nauru',
    'Pacific/Galapagos',
    'Pacific/Easter',
    'Pacific/Marquesas',
    'Pacific/Gambier',
  ];

  // Validate every fallback entry; drop any that the runtime rejects.
  const validFallback = fallbackZones.filter(isValidTimeZone);
  return sortTimeZoneList(validFallback, referenceDate);
}

/**
 * Sorts a list of IANA time zone identifiers by UTC offset (ascending) at
 * the given reference date, then alphabetically by region name within each
 * offset.  Uses the same reference date (Northern Hemisphere mid-year) as
 * the fallback path to ensure consistency.
 */
function sortTimeZoneList(zones: string[], referenceDate: Date): string[] {
  return [...zones].sort((a, b) => {
    const aOffset = new Intl.DateTimeFormat('en-US', { timeZone: a, timeZoneName: 'longOffset' })
      .formatToParts(referenceDate)
      .find((p) => p.type === 'timeZoneName')?.value;
    const bOffset = new Intl.DateTimeFormat('en-US', { timeZone: b, timeZoneName: 'longOffset' })
      .formatToParts(referenceDate)
      .find((p) => p.type === 'timeZoneName')?.value;

    // Parse the offset string to a numeric value for comparison.
    // Format examples: "UTC+00:00", "UTC+01:00", "UTC-05:00"
    const parseOffset = (s: string | undefined): number => {
      if (!s) return 0;
      const match = s.match(/UTC([+-])(\d{2}):(\d{2})/);
      if (!match) return 0;
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3], 10);
      return sign * (hours * 60 + minutes);
    };

    const aNum = parseOffset(aOffset);
    const bNum = parseOffset(bOffset);
    if (aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
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
