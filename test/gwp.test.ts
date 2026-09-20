import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatGwpNarration } from '../shared/gwp.js';
import type { EnrichedLegoSet } from '../shared/types.js';

describe('GWP helpers', () => {
  const sampleSets: EnrichedLegoSet[] = [
    {
      id: '10333',
      setNum: '10333-1',
      name: 'Barad-dûr',
    },
    {
      id: '75419',
      setNum: '75419-1',
      name: 'Death Star - UCS',
    },
    {
      id: '40693',
      setNum: '40693-1',
      name: 'Fell Beast',
      isGwp: true,
      gwpWithSetNumber: '10333',
      gwpDescription: 'Free with qualifying purchases of 10333 The Lord of the Rings: Barad-dûr at LEGO.com, June 2024.',
    },
    {
      id: '40771',
      setNum: '40771-1',
      name: 'TIE Fighter with Imperial Hangar Rack',
      isGwp: true,
      gwpWithSetNumber: '75419',
      gwpDescription: 'Free with qualifying purchases of 75419 Death Star at LEGO.com, October and December 2025.',
    },
    {
      id: '40788',
      setNum: '40788-1',
      name: 'Friendly Snails',
      isGwp: true,
      gwpDescription: 'Free with qualifying purchases at LEGO.com, July and October 2025.',
    },
    {
      id: '75192',
      setNum: '75192-1',
      name: 'Millennium Falcon - UCS',
      isGwp: false,
    },
  ];

  describe('formatGwpNarration', () => {
    it('returns null for regular non-GWP sets', () => {
      assert.strictEqual(formatGwpNarration(sampleSets[0]), null);
      assert.strictEqual(formatGwpNarration(sampleSets[5]), null);
      assert.strictEqual(formatGwpNarration({}), null);
    });

    it('generates specific companion phrasing when qualifying set exists in collection', () => {
      const phrase1 = formatGwpNarration(sampleSets[2], sampleSets);
      assert.strictEqual(phrase1, 'Released as a gift with purchase alongside Barad-dûr');

      const phrase2 = formatGwpNarration(sampleSets[3], sampleSets);
      assert.strictEqual(phrase2, 'Released as a gift with purchase alongside Death Star');
    });

    it('parses target name from gwpDescription when set list is not provided', () => {
      const gwpSet: Partial<EnrichedLegoSet> = {
        isGwp: true,
        gwpDescription: 'Free with qualifying purchases of 10354 The Lord of the Rings: The Shire at LEGO.com, April 2025.',
      };
      const phrase = formatGwpNarration(gwpSet);
      assert.strictEqual(phrase, 'Released as a gift with purchase alongside The Shire');
    });

    it('returns generic phrasing when no qualifying set is specified', () => {
      const phrase = formatGwpNarration(sampleSets[4], sampleSets);
      assert.strictEqual(phrase, 'Released as a gift with purchase');
    });
  });
});
