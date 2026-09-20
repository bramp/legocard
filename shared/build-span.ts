import type { EnrichedLegoSet } from './types.js';

export interface CalendarSpanInfo {
  totalDays: number;
  spanText: string;
}

/**
 * Calculates the calendar elapsed span between when a build was started and finished.
 * If the build spanned multiple days (e.g. 2 or more days), returns a human-friendly string
 * such as "2 days", "5 days", "1 week", "3 weeks", or "2 months".
 *
 * Excludes same-day or 0/1 day builds, and handles anomalies like pre-2000 spreadsheet dates.
 */
export function getCalendarBuildSpan(
  setOrStart?: Partial<EnrichedLegoSet> | string | null,
  finishArg?: string | null
): CalendarSpanInfo | null {
  if (!setOrStart) return null;

  let startStr: string | undefined;
  let finishStr: string | undefined;

  if (typeof setOrStart === 'object') {
    startStr = setOrStart.dateStarted;
    finishStr = setOrStart.dateFinished;
  } else {
    startStr = setOrStart;
    finishStr = finishArg ?? undefined;
  }

  if (!startStr || !finishStr) return null;

  const start = new Date(startStr.trim().replace(' ', 'T'));
  const finish = new Date(finishStr.trim().replace(' ', 'T'));

  if (isNaN(start.getTime()) || isNaN(finish.getTime())) return null;

  // Filter out invalid years / spreadsheet epoch defaults (e.g. 1899)
  if (start.getFullYear() < 2000 || finish.getFullYear() < 2000) return null;

  const diffMs = finish.getTime() - start.getTime();
  if (diffMs < 0) return null;

  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 2) return null;

  const weeks = Math.round(totalDays / 7);
  const months = Math.round(totalDays / 30);

  let spanText: string;
  if (totalDays < 7) {
    spanText = `${totalDays} days`;
  } else if (totalDays < 30) {
    spanText = weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else {
    spanText = months === 1 ? '1 month' : `${months} months`;
  }

  return { totalDays, spanText };
}

/**
 * Formats a build duration statement, incorporating the calendar span if the build
 * stretched over multiple days/weeks/months.
 *
 * e.g. "Built over 3 weeks for a total of 16 hours."
 * e.g. "Took 5 hours and 41 minutes to build." (when built in 0-1 days or without span dates)
 */
export function formatBuildStatement(
  set: Partial<EnrichedLegoSet> & { buildDuration?: string | null },
  options?: { shortName?: string }
): string | null {
  const duration = set.buildDuration || (set.timeToBuildFormatted ? set.timeToBuildFormatted : null);
  const span = getCalendarBuildSpan(set);
  const name = options?.shortName;

  if (span && duration) {
    if (name) {
      return `Built ${name} over ${span.spanText} for a total of ${duration}.`;
    }
    return `Built over ${span.spanText} for a total of ${duration}.`;
  }

  if (duration) {
    return `Took ${duration} to build.`;
  }

  return null;
}
