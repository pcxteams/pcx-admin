export interface DateRange {
  start: string;
  end: string;
}

export const DATE_PRESETS = [
  { value: 'ytd', label: 'YTD' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Resolve a preset to a concrete range; empty strings mean unbounded. Ported
 * from v2's Numbers page. Used by both the server page (so the first paint
 * already matches the default filter) and the client filter bar.
 */
export function presetRange(preset: string): DateRange {
  const today = new Date();
  const year = today.getFullYear();
  switch (preset) {
    case 'ytd':
      return { start: `${year}-01-01`, end: isoDay(today) };
    case 'this_year':
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    case 'this_month':
      return { start: isoDay(new Date(year, today.getMonth(), 1)), end: isoDay(today) };
    case 'last_30':
      return { start: isoDay(new Date(today.getTime() - 29 * 86_400_000)), end: isoDay(today) };
    default:
      return { start: '', end: '' };
  }
}

/** v2's default window: year to date. */
export const DEFAULT_DATE_PRESET = 'ytd';
