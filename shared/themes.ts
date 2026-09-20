/**
 * Explicit theme overrides for spoken audio narration and display.
 * NOTE: In the future, we could move these into an external file (e.g. templates/themes.json)
 * for non-code editorial management if the list grows large.
 */
export const THEME_OVERRIDES: Record<string, string> = {
  'Creator / Creator 3in1 / Creature': 'Creator 3-in-1',
  'Holiday & Event / Christmas': 'Holiday Christmas',
  'Holiday & Event / Halloween': 'Halloween',
  'Technic / Model / Space Exploration': 'Technic Space',
  'Star Wars / Ultimate Collector Series': 'Star Wars UCS',
  'Star Wars Ultimate Collector Series': 'Star Wars UCS',
};

/**
 * Normalizes themes into broad collection buckets for comparative facts
 * (e.g. "largest Star Wars set in the collection").
 */
export function cleanThemeName(theme?: string): string {
  if (!theme) return '';
  if (theme.includes('Lord of the Rings')) return 'Lord of the Rings';
  if (theme.includes('Star Wars')) return 'Star Wars';
  if (theme.includes('Ultimate Collector Series') || theme.includes('UCS')) return 'Star Wars';
  if (theme.includes('Icons')) return 'Icons';
  if (theme.includes('Harry Potter')) return 'Harry Potter';
  if (theme.includes('Architecture')) return 'Architecture';
  return theme.split('/')[0].replace(/\(.*?\)/g, '').trim();
}

/**
 * Simplifies verbose catalog themes into natural spoken lines.
 * e.g. "Icons (Creator Expert & Advanced Models) / Landmark" -> "Icons Landmark"
 * e.g. "The Hobbit & The Lord of the Rings / The Lord of the Rings / Icons (...)" -> "Lord of the Rings"
 * e.g. "Star Wars / Ultimate Collector Series" -> "Star Wars UCS"
 */
export function simplifyTheme(theme?: string): string {
  if (!theme) return '';
  if (THEME_OVERRIDES[theme]) return THEME_OVERRIDES[theme];

  // 1. Strip parenthetical notes like (Creator Expert & Advanced Models), (CUUSOO), etc.
  const cleaned = theme.replace(/\s*\([^)]*\)/g, '');

  // 2. Split segments by '/'
  let parts = cleaned
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  // 3. Drop filler and internal episode segments
  parts = parts.filter(
    (p) => !['Miscellaneous', 'Model'].includes(p) && !p.startsWith('Star Wars Episode')
  );

  // 4. Normalize common franchise prefixes and abbreviations
  parts = parts.map((p) => {
    if (p.includes('The Lord of the Rings') || p.includes('Lord of the Rings')) {
      return 'Lord of the Rings';
    }
    if (p === 'Ultimate Collector Series') {
      return 'UCS';
    }
    return p;
  });

  // 5. Deduplicate segments
  const deduped: string[] = [];
  for (const p of parts) {
    if (!deduped.includes(p)) {
      deduped.push(p);
    }
  }

  if (deduped.includes('Lord of the Rings')) {
    return 'Lord of the Rings';
  }

  if (deduped[0] === 'Star Wars' && deduped[1] === 'Sculptures') {
    return 'Star Wars';
  }

  const result = deduped.slice(0, 2).join(' ');
  return result.replace('Star Wars Ultimate Collector Series', 'Star Wars UCS');
}

/**
 * Checks if a theme already ends with a noun that means collection, line, series, or group.
 */
export function themeEndsWithCollectiveNoun(theme?: string): boolean {
  if (!theme) return false;
  const trimmed = theme.trim().replace(/[.,!?:;]+$/, '');
  return /\b(collection|collections|line|lines|series|group|groups|range|ranges)$/i.test(trimmed);
}

/**
 * Returns the theme formatted for narration, appending "line" unless the theme already
 * ends with a collective noun such as "Collection", "Line", "Series", or "Group".
 * e.g. "Star Wars Helmet Collection" -> "Star Wars Helmet Collection"
 * e.g. "Star Wars" -> "Star Wars line"
 */
export function formatThemeLine(theme?: string): string {
  if (!theme) return '';
  const trimmed = theme.trim();
  if (themeEndsWithCollectiveNoun(trimmed)) {
    return trimmed;
  }
  return `${trimmed} line`;
}

