import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isSetRetired, getRetiredYear } from '../shared/retirement.js';

describe('Retirement helpers', () => {
  const fixedNow = new Date('2026-09-20T12:00:00Z');

  describe('isSetRetired', () => {
    it('returns false for sets with no retirement info', () => {
      assert.strictEqual(isSetRetired({}, fixedNow), false);
      assert.strictEqual(isSetRetired({ dateRetired: undefined }, fixedNow), false);
    });

    it('returns true when dateRetired is explicitly "Retired"', () => {
      assert.strictEqual(isSetRetired({ dateRetired: 'Retired' }, fixedNow), true);
      assert.strictEqual(isSetRetired({ dateRetired: 'retired' }, fixedNow), true);
    });

    it('returns true when full date in the past', () => {
      assert.strictEqual(isSetRetired({ dateRetired: 'November 21, 2016' }, fixedNow), true);
      assert.strictEqual(isSetRetired({ dateRetired: 'March 1, 2024' }, fixedNow), true);
    });

    it('returns true when month/year in the past', () => {
      assert.strictEqual(isSetRetired({ dateRetired: 'October 2015' }, fixedNow), true);
      assert.strictEqual(isSetRetired({ dateRetired: 'July 2026' }, fixedNow), true);
    });

    it('returns false when date/month is in the future', () => {
      assert.strictEqual(isSetRetired({ dateRetired: 'December 2026' }, fixedNow), false);
      assert.strictEqual(isSetRetired({ dateRetired: 'December 31, 2027.' }, fixedNow), false);
      assert.strictEqual(isSetRetired({ dateRetired: 'December 31, 2028.' }, fixedNow), false);
    });

    it('evaluates year string when dateRetired is only a year', () => {
      assert.strictEqual(isSetRetired({ dateRetired: '2020' }, fixedNow), true);
      assert.strictEqual(isSetRetired({ dateRetired: '2027' }, fixedNow), false);
    });
  });

  describe('getRetiredYear', () => {
    it('returns null if set is not yet retired', () => {
      assert.strictEqual(getRetiredYear({ dateRetired: 'December 2026' }, fixedNow), null);
      assert.strictEqual(getRetiredYear({ dateRetired: 'December 31, 2027.' }, fixedNow), null);
    });

    it('extracts year from dateRetired if set is already retired', () => {
      assert.strictEqual(getRetiredYear({ dateRetired: 'October 2015' }, fixedNow), 2015);
      assert.strictEqual(getRetiredYear({ dateRetired: 'November 21, 2016' }, fixedNow), 2016);
      assert.strictEqual(getRetiredYear({ dateRetired: '2020' }, fixedNow), 2020);
    });

    it('returns null if dateRetired is "Retired" without a year', () => {
      assert.strictEqual(getRetiredYear({ dateRetired: 'Retired' }, fixedNow), null);
    });
  });
});
