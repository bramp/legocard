import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeRatingFacts } from '../shared/rating-facts.js';
import type { EnrichedLegoSet } from '../shared/types.js';

describe('Rating Facts helpers', () => {
  const collection: Partial<EnrichedLegoSet>[] = [
    { id: '1', name: 'Top Set', ratingBuild: 5, ratingLooks: 5 },
    { id: '2', name: 'Fun Build', ratingBuild: 5, ratingLooks: 4 },
    { id: '3', name: 'Pretty Model', ratingBuild: 3, ratingLooks: 5 },
    { id: '4', name: 'Great All Rounder', ratingBuild: 4.5, ratingLooks: 4.5 },
    { id: '5', name: 'Average Set', ratingBuild: 3, ratingLooks: 3 },
  ];

  it('highlights perfect 5/5 for both build and looks', () => {
    const res = computeRatingFacts(collection[0], collection as EnrichedLegoSet[]);
    assert.strictEqual(
      res.primaryRatingFact,
      'It is rated a perfect five out of five for both build experience and display looks.'
    );
  });

  it('highlights 5/5 building fun', () => {
    const res = computeRatingFacts(collection[1], collection as EnrichedLegoSet[]);
    assert.strictEqual(res.primaryRatingFact, 'It is rated a top five out of five for building fun.');
  });

  it('highlights 5/5 display looks', () => {
    const res = computeRatingFacts(collection[2], collection as EnrichedLegoSet[]);
    assert.strictEqual(res.primaryRatingFact, 'It is rated a top five out of five for display looks.');
  });

  it('highlights 4.5+ high-rated build or looks', () => {
    const res = computeRatingFacts(collection[3], collection as EnrichedLegoSet[]);
    assert.strictEqual(res.primaryRatingFact, 'It is rated as one of our most fun builds in the collection.');
    assert.strictEqual(res.ratingFacts[1], 'It is rated as one of our best-looking display models in the collection.');
  });

  it('returns empty facts when ratings are average or missing', () => {
    const resAvg = computeRatingFacts(collection[4], collection as EnrichedLegoSet[]);
    assert.strictEqual(resAvg.primaryRatingFact, '');
    assert.strictEqual(resAvg.ratingFacts.length, 0);

    const resNone = computeRatingFacts({}, collection as EnrichedLegoSet[]);
    assert.strictEqual(resNone.primaryRatingFact, '');
    assert.strictEqual(resNone.ratingFacts.length, 0);
  });
});
