import type { EnrichedLegoSet } from './types.js';

export interface RetirementInfo {
  isRetired: boolean;
  retiredYear: number | null;
}

/**
 * Determines whether a Lego set is already retired relative to a reference date (defaults to now).
 *
 * Rules:
 * - If `dateRetired` is explicitly 'Retired', it is retired.
 * - If `dateRetired` contains a parseable date or month/year, checks if that date has passed.
 * - If `dateRetired` contains only a year, checks if that year is strictly in the past.
 */
export function isSetRetired(
  set: Pick<EnrichedLegoSet, 'dateRetired'> | { dateRetired?: string },
  refDate: Date = new Date()
): boolean {
  const dRet = (set.dateRetired || '').trim().replace(/\.+$/, '');
  if (!dRet) return false;
  if (dRet.toLowerCase() === 'retired') return true;

  const cleaned = dRet.replace(/^early to mid /i, 'June ');
  const monthYearMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      return endOfMonth <= refDate;
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return endOfDay <= refDate;
  }

  const match = dRet.match(/\b(19\d\d|20\d\d)\b/);
  if (match) {
    return parseInt(match[1], 10) < refDate.getFullYear();
  }

  return false;
}

/**
 * Returns the retirement year if the set is already retired, or null otherwise.
 */
export function getRetiredYear(
  set: Pick<EnrichedLegoSet, 'dateRetired'> | { dateRetired?: string },
  refDate: Date = new Date()
): number | null {
  if (!isSetRetired(set, refDate)) return null;
  const dRet = (set.dateRetired || '').trim().replace(/\.+$/, '');
  const match = dRet.match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}
