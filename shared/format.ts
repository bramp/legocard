import type { EnrichedLegoSet } from './types.js';

export interface FormatBuildTimeOptions {
  /** If true, joins with 'and', e.g. "1 hour and 2 minutes". Otherwise "1 hour 2 minutes". Default: false */
  useAnd?: boolean;
}

/**
 * Formats a set's build duration into a human-friendly string like "1 hour 2 minutes",
 * "7 hours 22 minutes", or "47 minutes".
 */
export function formatBuildTime(
  setOrHours?: number | Partial<EnrichedLegoSet> | { buildTimeHours?: number; timeToBuildFormatted?: string } | null,
  options?: FormatBuildTimeOptions
): string | null {
  if (setOrHours === undefined || setOrHours === null) return null;

  let hours = 0;
  let minutes = 0;

  if (typeof setOrHours === 'object') {
    const raw = setOrHours.timeToBuildFormatted;
    if (raw) {
      const match = raw.match(
        /^(?:(\d+)\s*(?:h|hours?))?\s*(?:and\s*)?(?:(\d+)\s*(?:m|minutes?|mins?))?$/i
      );
      if (match && (match[1] || match[2])) {
        hours = parseInt(match[1] || '0', 10);
        minutes = parseInt(match[2] || '0', 10);
      }
    }

    if (hours === 0 && minutes === 0 && typeof setOrHours.buildTimeHours === 'number') {
      const totalMinutes = Math.round(setOrHours.buildTimeHours * 60);
      hours = Math.floor(totalMinutes / 60);
      minutes = totalMinutes % 60;
    }
  } else if (typeof setOrHours === 'number') {
    const totalMinutes = Math.round(setOrHours * 60);
    hours = Math.floor(totalMinutes / 60);
    minutes = totalMinutes % 60;
  }

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
  }
  if (minutes > 0) {
    parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`);
  }

  if (parts.length === 0) return null;
  return parts.join(options?.useAnd ? ' and ' : ' ');
}
