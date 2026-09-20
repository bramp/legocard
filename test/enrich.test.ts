import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseRating, getRecordField } from '../scripts/enrich-data.js';
import type { CsvLegoRecord, EnrichedLegoSet } from '../shared/types.js';

describe('Enrichment Helpers', () => {
  describe('parseRating', () => {
    it('parses numeric values and decimal strings', () => {
      assert.strictEqual(parseRating(5), 5);
      assert.strictEqual(parseRating(4.5), 4.5);
      assert.strictEqual(parseRating('5'), 5);
      assert.strictEqual(parseRating('4.5'), 4.5);
      assert.strictEqual(parseRating(' 4.2 '), 4.2);
    });

    it('parses comma-separated decimals', () => {
      assert.strictEqual(parseRating('4,5'), 4.5);
      assert.strictEqual(parseRating('3,8'), 3.8);
    });

    it('parses fraction ratings (e.g. 5/5, 4/5, 8/10)', () => {
      assert.strictEqual(parseRating('5/5'), 5);
      assert.strictEqual(parseRating('4/5'), 4);
      assert.strictEqual(parseRating('4.5/5'), 4.5);
      assert.strictEqual(parseRating('8/10'), 4);
      assert.strictEqual(parseRating('10/10'), 5);
    });

    it('returns undefined for empty, invalid, or error formula values', () => {
      assert.strictEqual(parseRating(undefined), undefined);
      assert.strictEqual(parseRating(null), undefined);
      assert.strictEqual(parseRating(''), undefined);
      assert.strictEqual(parseRating('   '), undefined);
      assert.strictEqual(parseRating('#REF!'), undefined);
      assert.strictEqual(parseRating('#VALUE!'), undefined);
      assert.strictEqual(parseRating('#N/A'), undefined);
      assert.strictEqual(parseRating('not-a-number'), undefined);
      assert.strictEqual(parseRating(-1), undefined);
    });

    it('supports zero rating', () => {
      assert.strictEqual(parseRating(0), 0);
      assert.strictEqual(parseRating('0'), 0);
    });
  });

  describe('getRecordField', () => {
    it('returns exact matching key value', () => {
      const record = { 'Rating (Build)': '5', Collection: 'Starwars Helmets' };
      assert.strictEqual(getRecordField(record, 'Rating (Build)'), '5');
      assert.strictEqual(getRecordField(record, 'Collection'), 'Starwars Helmets');
    });

    it('falls back to alternate key names', () => {
      const record = { rating_build: '4.5', collection: 'Lightsabers' };
      assert.strictEqual(
        getRecordField(record, 'Rating (Build)', 'rating_build', 'ratingBuild'),
        '4.5'
      );
      assert.strictEqual(getRecordField(record, 'Collection', 'collection'), 'Lightsabers');
    });

    it('performs case-insensitive matching', () => {
      const record = { 'rating (looks)': '4', collection: 'Upscale Minifigs' };
      assert.strictEqual(
        getRecordField(record, 'Rating (Looks)', 'rating_looks', 'ratingLooks'),
        '4'
      );
    });

    it('returns undefined when no keys match or value is empty', () => {
      const record = { 'Rating (Build)': '  ', Other: 'value' };
      assert.strictEqual(getRecordField(record, 'Rating (Build)'), undefined);
      assert.strictEqual(getRecordField(record, 'Missing'), undefined);
    });
  });

  describe('EnrichedLegoSet types and field integration', () => {
    it('allows assigning collection and rating fields to EnrichedLegoSet', () => {
      const set: EnrichedLegoSet = {
        id: '75304',
        setNum: '75304-1',
        name: 'Darth Vader Helmet',
        theme: 'Star Wars / Helmet Collection',
        collection: 'Starwars Helmets',
        ratingBuild: 4.5,
        ratingLooks: 5,
        rating: 4.1,
      };

      assert.strictEqual(set.collection, 'Starwars Helmets');
      assert.strictEqual(set.ratingBuild, 4.5);
      assert.strictEqual(set.ratingLooks, 5);
      assert.strictEqual(set.rating, 4.1);
    });

    it('allows mapping from CsvLegoRecord to EnrichedLegoSet fields', () => {
      const csvRecord: CsvLegoRecord = {
        'Set Number': '75304',
        Name: 'Darth Vader Helmet',
        Collection: 'Starwars Helmets',
        'Rating (Build)': '4.5',
        'Rating (Looks)': '5/5',
      };

      const ratingBuild = parseRating(
        getRecordField(
          csvRecord as Record<string, string>,
          'Rating (Build)',
          'rating_build',
          'ratingBuild'
        )
      );
      const ratingLooks = parseRating(
        getRecordField(
          csvRecord as Record<string, string>,
          'Rating (Looks)',
          'rating_looks',
          'ratingLooks'
        )
      );
      const collection = getRecordField(
        csvRecord as Record<string, string>,
        'Collection',
        'collection'
      );

      assert.strictEqual(collection, 'Starwars Helmets');
      assert.strictEqual(ratingBuild, 4.5);
      assert.strictEqual(ratingLooks, 5);
    });
  });
});
