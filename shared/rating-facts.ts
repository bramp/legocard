import type { EnrichedLegoSet } from './types.js';

export interface RatingFactsInfo {
  ratingBuild?: number;
  ratingLooks?: number;
  ratingBuildRank: number | null;
  ratingLooksRank: number | null;
  isTopBuild: boolean;
  isTopLooks: boolean;
  totalRatedBuild: number;
  totalRatedLooks: number;
  ratingFacts: string[];
  primaryRatingFact: string;
}

/**
 * Computes comparative ranking metrics across the collection for personal ratings
 * (ratingBuild and ratingLooks).
 *
 * Provides clean flags (`isTopBuild`, `isTopLooks`, ranks) so the presentation layer
 * (Liquid template) can simply evaluate `if ratingBuild == 5 and ratingLooks == 5`,
 * `if isTopBuild`, etc.
 */
export function computeRatingFacts(
  set: Partial<EnrichedLegoSet>,
  allSets?: EnrichedLegoSet[]
): RatingFactsInfo {
  const collection = allSets && allSets.length > 0 ? allSets : [];
  const facts: string[] = [];

  const bVal = typeof set.ratingBuild === 'number' ? set.ratingBuild : null;
  const lVal = typeof set.ratingLooks === 'number' ? set.ratingLooks : null;

  const withBuild = collection
    .filter((s) => typeof s.ratingBuild === 'number')
    .sort((a, b) => b.ratingBuild! - a.ratingBuild!);

  const withLooks = collection
    .filter((s) => typeof s.ratingLooks === 'number')
    .sort((a, b) => b.ratingLooks! - a.ratingLooks!);

  const bRank = bVal !== null ? withBuild.findIndex((s) => s.id === set.id) + 1 : 0;
  const lRank = lVal !== null ? withLooks.findIndex((s) => s.id === set.id) + 1 : 0;

  const isTopBuild = bRank === 1 && bVal !== null && bVal >= 4.5 && withBuild.length >= 3;
  const isTopLooks = lRank === 1 && lVal !== null && lVal >= 4.5 && withLooks.length >= 3;

  if (bVal !== null || lVal !== null) {
    if (bVal === 5 && lVal === 5) {
      facts.push('It is rated a perfect five out of five for both build experience and display looks.');
    } else {
      // Building rating highlights
      if (bVal === 5) {
        facts.push('It is rated a top five out of five for building fun.');
      } else if (isTopBuild) {
        facts.push('It is our highest-rated build experience in the collection.');
      } else if (bVal !== null && bVal >= 4.5) {
        facts.push('It is rated as one of our most fun builds in the collection.');
      }

      // Looks rating highlights
      if (lVal === 5) {
        facts.push('It is rated a top five out of five for display looks.');
      } else if (isTopLooks) {
        facts.push('It is our highest-rated display piece for looks.');
      } else if (lVal !== null && lVal >= 4.5) {
        facts.push('It is rated as one of our best-looking display models in the collection.');
      }
    }
  }

  return {
    ratingBuild: bVal ?? undefined,
    ratingLooks: lVal ?? undefined,
    ratingBuildRank: bRank > 0 ? bRank : null,
    ratingLooksRank: lRank > 0 ? lRank : null,
    isTopBuild,
    isTopLooks,
    totalRatedBuild: withBuild.length,
    totalRatedLooks: withLooks.length,
    ratingFacts: facts,
    primaryRatingFact: facts[0] || '',
  };
}

