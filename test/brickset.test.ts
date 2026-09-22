import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseBricksetDate, BricksetBackend } from '../scripts/backends/brickset.js';
import { createHttpClient } from '../scripts/backends/http-client.js';
import type { BricksetSet } from '../shared/types.js';

describe('Brickset Backend', () => {
  describe('parseBricksetDate', () => {
    it('parses full ISO date string into year and formatted month-day-year', () => {
      const res = parseBricksetDate('2016-11-20T00:00:00Z');
      assert.notStrictEqual(res, null);
      assert.strictEqual(res?.year, 2016);
      assert.strictEqual(res?.dateStr, 'November 20, 2016');
    });

    it('returns null for undefined or invalid input', () => {
      assert.strictEqual(parseBricksetDate(undefined), null);
      assert.strictEqual(parseBricksetDate('invalid-date-string'), null);
    });
  });

  describe('BricksetBackend.enrich', () => {
    it('extracts retired date, release date, age, and dimensions from cached set data', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brickset-test-'));

      const sampleSet: BricksetSet = {
        setID: 10234,
        number: '10234',
        numberVariant: 1,
        name: 'Sydney Opera House',
        year: 2013,
        theme: 'Creator Expert',
        pieces: 2989,
        rating: 4.8,
        instructionsCount: 4,
        ageRange: { min: 16 },
        dimensions: { height: 28, width: 63, depth: 38 },
        LEGOCom: {
          US: {
            retailPrice: 319.99,
            dateFirstAvailable: '2013-08-16T00:00:00Z',
            dateLastAvailable: '2016-11-20T00:00:00Z',
          },
        },
      };

      fs.writeFileSync(
        path.join(tmpDir, 'set_10234-1.json'),
        JSON.stringify(sampleSet, null, 2),
        'utf-8'
      );

      const backend = new BricksetBackend({ cacheDir: tmpDir });
      const result = await backend.enrich({
        cleanId: '10234',
        setNum: '10234-1',
        csvRecord: {},
      });

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.dateRetired, 'November 20, 2016');
      assert.strictEqual(result?.year, 2013);
      assert.strictEqual(result?.dateReleased, 'August 16, 2013');
      assert.strictEqual(result?.age, '16+');
      assert.strictEqual(result?.pieces, 2989);
      assert.strictEqual(result?.instructionBooks, 4);
      assert.deepStrictEqual(result?.dimensions, { height: 28, width: 63, depth: 38 });

      // Clean up tmp dir
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('queries Brickset API via HttpClient when set is not in cache', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brickset-test-'));
      try {
        const mockFetch: typeof fetch = async (input, init) => {
          const body = input instanceof Request ? await input.clone().text() : String(init?.body);
          assert(body.includes('apiKey=test-brickset-key'));

          return new Response(
            JSON.stringify({
              status: 'success',
              matches: 1,
              sets: [
                {
                  setID: 75304,
                  number: '75304',
                  numberVariant: 1,
                  name: 'Darth Vader Helmet',
                  year: 2021,
                  theme: 'Star Wars',
                  subtheme: 'Helmet Collection',
                  pieces: 834,
                  rating: 4.7,
                  ageRange: { min: 18 },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        };

        const mockClient = createHttpClient({
          fetch: mockFetch,
          retryDelay: () => 0,
          logger: null,
        });

        const backend = new BricksetBackend({
          apiKey: 'test-brickset-key',
          cacheDir: tmpDir,
          httpClient: mockClient,
        });

        const result = await backend.enrich({
          cleanId: '75304',
          setNum: '75304-1',
          csvRecord: {},
        });

        assert.notStrictEqual(result, null);
        assert.strictEqual(result?.name, 'Darth Vader Helmet');
        assert.strictEqual(result?.year, 2021);
        assert.strictEqual(result?.theme, 'Star Wars / Helmet Collection');
        assert.strictEqual(result?.pieces, 834);
        assert.strictEqual(result?.age, '18+');

        // Verify it was saved to cache
        assert(fs.existsSync(path.join(tmpDir, 'set_75304-1.json')));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
