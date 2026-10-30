/**
 * Formats a minute count as `"<h> h <m> min"` (e.g. `3 h 20 min`),
 * `"<m> min"` (e.g. `45 min`) or `0 min`. Used by the remaining-work
 * and workload-warning surfaces (EP06G).
 */
export function formatMinutes(total: number): string {
  const safe = Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0;
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  return `${minutes} min`;
}
