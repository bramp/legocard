import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatBuildTime, cleanSetName, cleanTitle, cleanPromptTitle } from '../shared/format.js';

describe('Format helpers', () => {
  describe('cleanSetName / cleanTitle', () => {
    it('removes " - UCS" suffix from set titles', () => {
      assert.strictEqual(cleanSetName("Jabba's Sail Barge - UCS"), "Jabba's Sail Barge");
      assert.strictEqual(cleanSetName('AT-AT - UCS'), 'AT-AT');
      assert.strictEqual(cleanSetName('X-wing Starfighter - UCS'), 'X-wing Starfighter');
      assert.strictEqual(cleanSetName('AT-ST Walker - UCS'), 'AT-ST Walker');
      assert.strictEqual(cleanSetName('Death Star - UCS'), 'Death Star');
      assert.strictEqual(cleanTitle("Jabba's Sail Barge - UCS"), "Jabba's Sail Barge");
    });

    it('removes " - UCS" when followed by edition or notes', () => {
      assert.strictEqual(
        cleanSetName('Millennium Falcon - UCS {2nd edition}'),
        'Millennium Falcon {2nd edition}'
      );
    });

    it('preserves names without UCS', () => {
      assert.strictEqual(cleanSetName('The Tower of Orthanc'), 'The Tower of Orthanc');
      assert.strictEqual(cleanSetName('AT-AT'), 'AT-AT');
      assert.strictEqual(cleanSetName('TIE Interceptor - Mini polybag'), 'TIE Interceptor - Mini polybag');
    });

    it('handles empty or undefined values', () => {
      assert.strictEqual(cleanSetName(undefined), '');
      assert.strictEqual(cleanSetName(''), '');
    });
  });

  describe('cleanPromptTitle', () => {
    it('strips redundant suffixes and bracketed edition notes', () => {
      assert.strictEqual(cleanPromptTitle('Taj Mahal {Reissue}'), 'Taj Mahal');
      assert.strictEqual(cleanPromptTitle('Millennium Falcon - UCS {2nd edition}'), 'Millennium Falcon');
      assert.strictEqual(cleanPromptTitle("Jabba's Sail Barge - UCS"), "Jabba's Sail Barge");
    });

    it('handles empty or undefined values', () => {
      assert.strictEqual(cleanPromptTitle(undefined), '');
      assert.strictEqual(cleanPromptTitle(''), '');
    });
  });

  describe('formatBuildTime', () => {
    it('formats hours and minutes', () => {
      assert.strictEqual(formatBuildTime({ buildTimeHours: 1.5 }), '1 hour 30 minutes');
      assert.strictEqual(formatBuildTime({ buildTimeHours: 1.5 }, { useAnd: true }), '1 hour and 30 minutes');
    });

    it('formats raw string formatted times', () => {
      assert.strictEqual(formatBuildTime({ timeToBuildFormatted: '5h 41m' }, { useAnd: true }), '5 hours and 41 minutes');
    });

    it('returns null when no build time is present', () => {
      assert.strictEqual(formatBuildTime(undefined), null);
      assert.strictEqual(formatBuildTime(null), null);
    });
  });
});
