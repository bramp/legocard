import type { EnrichedLegoSet } from './types.js';
import { cleanSetName } from './format.js';

/**
 * Generates a spoken narration phrase for Gift with Purchase (GWP) sets.
 *
 * e.g. "Released as a gift with purchase alongside Barad-dûr"
 * e.g. "Released as a gift with purchase"
 */
export function formatGwpNarration(
  set: Pick<EnrichedLegoSet, 'isGwp' | 'gwpWithSetNumber' | 'gwpDescription'>,
  allSets?: EnrichedLegoSet[]
): string | null {
  if (!set.isGwp) return null;

  let targetName: string | undefined;

  // 1. If we have the target set ID, look it up in allSets
  if (set.gwpWithSetNumber && allSets) {
    const targetSet = allSets.find((s) => s.id === set.gwpWithSetNumber);
    if (targetSet?.name) {
      targetName = cleanSetName(targetSet.name);
    }
  }

  // 2. Otherwise parse target name from gwpDescription if available
  if (!targetName && set.gwpDescription) {
    const match = set.gwpDescription.match(
      /Free with qualifying purchases of (\d{4,6})(?:\s+([^,]+?))?\s+at LEGO\.com/i
    );
    if (match) {
      const parsedId = match[1];
      if (allSets) {
        const found = allSets.find((s) => s.id === parsedId);
        if (found?.name) {
          targetName = cleanSetName(found.name);
        }
      }
      if (!targetName && match[2]) {
        targetName = cleanSetName(match[2].replace(/^The Lord of the Rings:\s*/i, '').trim());
      }
    }
  }

  if (targetName) {
    targetName = targetName.replace(/^The Lord of the Rings:\s*/i, '').trim();
    return `Released as a gift with purchase alongside ${targetName}`;
  }

  return 'Released as a gift with purchase';
}
