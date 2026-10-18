// Shared IANA time zone-aware date/time formatting helpers.
// Stub per TECH-01 (STUDY-20): consumed by SP-106 (profile preferences),
// SP-106E (select dropdown), EP04 (calendar), and EP05 (dashboard).
// Extend this module — do not fork it.
//
// SP-106E (IR-106-11 fix): `getTimeZones()` reads the standard ES2022
// `Intl.supportedValuesOf('timeZone')` API and parses the `GMT±HH:MM`
// offsets `timeZoneName: 'longOffset'` actually emits.

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
 * Curated fallback list of the most-common IANA zones for runtimes without
 * `Intl.supportedValuesOf` (older browsers / Node < 18). Exported and unit
 * tested against `isValidTimeZone` per the SP-106E technical note
 * (IR-106-15a). Entries are validated in `getTimeZones()` before rendering.
 */
export const FALLBACK_TIME_ZONES: readonly string[] = [
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
  'Atlantic/Reykjavik',
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
  'Pacific/Honolulu',
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

/** Fixed reference date: Northern Hemisphere mid-year avoids DST edge cases. */
const TIME_ZONE_REFERENCE_DATE = new Date('2026-06-15T12:00:00Z');

/**
 * Memoized result of `getTimeZones()` (IR-106-15b): the sorted list is
 * immutable and identical for the lifetime of the page, so it is built once
 * instead of on every Profile render (~400 `Intl.DateTimeFormat`
 * constructions per keystroke before memoization).
 */
let cachedTimeZones: string[] | null = null;

/**
 * Returns all IANA time zones supported by the runtime, sorted by UTC
 * offset (ascending) then alphabetically by region name within each offset.
 *
 * Uses the standard ES2022 `Intl.supportedValuesOf('timeZone')` API when
 * available (IR-106-11a: the API lives on `Intl`, NOT on
 * `Intl.DateTimeFormat`); falls back to the exported curated
 * `FALLBACK_TIME_ZONES` list on older runtimes, filtered through
 * `isValidTimeZone` so only real zones are offered.
 */
export function getTimeZones(): string[] {
  if (cachedTimeZones) return cachedTimeZones;

  // ES2022+ path: the standard API, when the runtime provides it. The web
  // app compiles against lib ES2020, so the static is accessed through a
  // narrow structural type.
  const intl = Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] };
  const zones =
    typeof intl.supportedValuesOf === 'function'
      ? intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES.filter(isValidTimeZone);

  cachedTimeZones = sortTimeZoneList(zones, TIME_ZONE_REFERENCE_DATE);
  return cachedTimeZones;
}

/**
 * Sorts a list of IANA time zone identifiers by UTC offset (ascending) at
 * the given reference date, then alphabetically by region name within each
 * offset.
 */
function sortTimeZoneList(zones: string[], referenceDate: Date): string[] {
  // Precompute each zone's offset once (IR-106-11b: the comparator used to
  // reformat both zones on every comparison — O(n log n) Intl constructions).
  const offsets = new Map(zones.map((zone) => [zone, utcOffsetMinutes(zone, referenceDate)]));

  return [...zones].sort((a, b) => {
    const aOffset = offsets.get(a) ?? 0;
    const bOffset = offsets.get(b) ?? 0;
    if (aOffset !== bOffset) return aOffset - bOffset;
    return a.localeCompare(b);
  });
}

/**
 * UTC offset of `timeZone` at `referenceDate`, in minutes west-negative
 * (e.g. `America/New_York` in June → -240, `Asia/Kolkata` → +330).
 *
 * `timeZoneName: 'longOffset'` emits the `GMT±HH:MM` form — e.g.
 * `GMT-04:00`, `GMT+05:30`, or a bare `GMT` for UTC+0 (IR-106-11b: the
 * previous parser matched a `UTC±HH:MM` form Intl never emits, so every
 * zone parsed as offset 0 and the "sorted by offset" order degraded to
 * pure alphabetical).
 */
function utcOffsetMinutes(timeZone: string, referenceDate: Date): number {
  const value = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(referenceDate)
    .find((part) => part.type === 'timeZoneName')?.value;

  if (!value) return 0;
  const match = value.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0; // bare "GMT" (or unrecognized form) → UTC+0.
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
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
