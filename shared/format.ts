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

/**
 * Cleans a Lego set title/name by removing redundant descriptors or suffixes
 * such as " - UCS".
 *
 * e.g. "Jabba's Sail Barge - UCS" -> "Jabba's Sail Barge"
 * e.g. "AT-AT - UCS" -> "AT-AT"
 * e.g. "Millennium Falcon - UCS {2nd edition}" -> "Millennium Falcon {2nd edition}"
 */
export function cleanSetName(name?: string): string {
  if (!name) return '';
  return name.replace(/\s*-\s*UCS\b/gi, '').replace(/\s+/g, ' ').trim();
}

export const cleanTitle = cleanSetName;

/**
 * Cleans a Lego set title/name for AI prompts by removing redundant suffixes
 * (" - UCS") and bracketed edition notes (e.g. "{Reissue}", "{2nd edition}").
 *
 * e.g. "Taj Mahal {Reissue}" -> "Taj Mahal"
 * e.g. "Millennium Falcon - UCS {2nd edition}" -> "Millennium Falcon"
 */
export function cleanPromptTitle(name?: string): string {
  if (!name) return '';
  return cleanSetName(name)
    .replace(/\s*\{[^}]*\}\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export {
  cleanThemeName,
  simplifyTheme,
  THEME_OVERRIDES,
  themeEndsWithCollectiveNoun,
  formatThemeLine,
} from './themes.js';
export { isSetRetired, getRetiredYear, type RetirementInfo } from './retirement.js';
export { formatGwpNarration, resolveGwpTargetName } from './gwp.js';
