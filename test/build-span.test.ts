import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCalendarBuildSpan, formatBuildStatement } from '../shared/build-span.js';

describe('Build Span helpers', () => {
  describe('getCalendarBuildSpan', () => {
    it('returns null when start or finish date is missing', () => {
      assert.strictEqual(getCalendarBuildSpan(null), null);
      assert.strictEqual(getCalendarBuildSpan({ dateStarted: undefined, dateFinished: '2026-05-10' }), null);
      assert.strictEqual(getCalendarBuildSpan({ dateStarted: '2026-05-10', dateFinished: undefined }), null);
    });

    it('returns null for same-day or 0-day builds', () => {
      const span = getCalendarBuildSpan({
        dateStarted: '2026-03-01 17:26',
        dateFinished: '2026-03-01 18:00',
      });
      assert.strictEqual(span, null);
    });

    it('returns null for pre-2000 spreadsheet epoch dates (e.g. 1899)', () => {
      const span = getCalendarBuildSpan({
        dateStarted: '1899-12-30 22:12',
        dateFinished: '2026-02-07 15:03',
      });
      assert.strictEqual(span, null);
    });

    it('formats multi-day spans (2-6 days)', () => {
      const span = getCalendarBuildSpan({
        dateStarted: '2026-05-07 19:55',
        dateFinished: '2026-05-09 17:41',
      });
      assert.notStrictEqual(span, null);
      assert.strictEqual(span?.spanText, '2 days');

      const span5 = getCalendarBuildSpan({
        dateStarted: '2026-06-01 11:42',
        dateFinished: '2026-06-06 14:45',
      });
      assert.strictEqual(span5?.spanText, '5 days');
    });

    it('formats multi-week spans (7-29 days)', () => {
      const span1w = getCalendarBuildSpan({
        dateStarted: '2026-09-12 20:19',
        dateFinished: '2026-09-19 14:55',
      });
      assert.strictEqual(span1w?.spanText, '1 week');

      const span3w = getCalendarBuildSpan({
        dateStarted: '2026-08-23 21:36',
        dateFinished: '2026-09-10 22:50',
      });
      assert.strictEqual(span3w?.spanText, '3 weeks');

      const span4w = getCalendarBuildSpan({
        dateStarted: '2025-08-10 16:55',
        dateFinished: '2025-09-07 22:28',
      });
      assert.strictEqual(span4w?.spanText, '4 weeks');
    });

    it('formats month spans (30+ days)', () => {
      const span2m = getCalendarBuildSpan({
        dateStarted: '2025-09-09 21:21',
        dateFinished: '2025-10-25 15:00',
      });
      assert.strictEqual(span2m?.spanText, '2 months');
    });
  });

  describe('formatBuildStatement', () => {
    it('returns combined span and duration when both exist', () => {
      const stmt = formatBuildStatement({
        dateStarted: '2026-08-23 21:36',
        dateFinished: '2026-09-10 22:50',
        timeToBuildFormatted: '7 hours and 22 minutes',
      });
      assert.strictEqual(stmt, 'Built over 3 weeks for a total of 7 hours and 22 minutes.');
    });

    it('includes short set name when provided', () => {
      const stmt = formatBuildStatement(
        {
          dateStarted: '2026-08-23 21:36',
          dateFinished: '2026-09-10 22:50',
          timeToBuildFormatted: '16 hours',
        },
        { shortName: 'the Death Star' }
      );
      assert.strictEqual(stmt, 'Built the Death Star over 3 weeks for a total of 16 hours.');
    });

    it('falls back to standard duration when span is null', () => {
      const stmt = formatBuildStatement({
        timeToBuildFormatted: '47 minutes',
      });
      assert.strictEqual(stmt, 'Took 47 minutes to build.');
    });

    it('returns null when duration is missing', () => {
      assert.strictEqual(formatBuildStatement({}), null);
    });
  });
});
