import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RebrickableBackend } from '../scripts/backends/rebrickable.js';
import { createHttpClient } from '../scripts/backends/http-client.js';

describe('Rebrickable Backend', () => {
  describe('cache handling', () => {
    it('returns null when set is not cached and no API key is provided', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebrickable-test-'));
      try {
        const backend = new RebrickableBackend({ cacheDir: tmpDir });
        const res = await backend.enrich({
          cleanId: '10497',
          setNum: '10497-1',
          csvRecord: {},
        });

        assert.strictEqual(res, null);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('returns cached set and theme metadata without network calls', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebrickable-test-'));
      try {
        fs.writeFileSync(
          path.join(tmpDir, 'set_99999-1.json'),
          JSON.stringify({
            set_num: '99999-1',
            name: 'Custom Test Castle',
            year: 2024,
            theme_id: 123,
            num_parts: 550,
            set_img_url: 'https://example.com/custom.jpg',
          })
        );
        fs.writeFileSync(
          path.join(tmpDir, 'theme_123.json'),
          JSON.stringify({
            id: 123,
            name: 'Castle / Classic',
          })
        );

        const backend = new RebrickableBackend({ cacheDir: tmpDir });
        const res = await backend.enrich({
          cleanId: '99999',
          setNum: '99999-1',
          csvRecord: {},
        });

        assert.notStrictEqual(res, null);
        assert.strictEqual(res?.name, 'Custom Test Castle');
        assert.strictEqual(res?.year, 2024);
        assert.strictEqual(res?.theme, 'Castle / Classic');
        assert.strictEqual(res?.pieces, 550);
        assert.strictEqual(res?.imageUrl, 'https://example.com/custom.jpg');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('API enrichment with mock HttpClient', () => {
    it('fetches set and theme via HttpClient when API key is provided and writes to cache', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebrickable-test-'));
      try {
        const requestedUrls: string[] = [];
        let authHeader = '';

        const mockFetch: typeof fetch = async (input, init) => {
          const url = input instanceof Request ? input.url : String(input);
          requestedUrls.push(url);
          const headers = input instanceof Request ? input.headers : new Headers(init?.headers);
          authHeader = headers.get('Authorization') || '';

          if (url.includes('/sets/42000-1/')) {
            return new Response(
              JSON.stringify({
                set_num: '42000-1',
                name: 'Grand Prix Racer',
                year: 2013,
                theme_id: 1,
                num_parts: 1141,
                set_img_url: 'https://example.com/42000.jpg',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }

          if (url.includes('/themes/1/')) {
            return new Response(
              JSON.stringify({
                id: 1,
                name: 'Technic',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }

          return new Response('Not Found', { status: 404 });
        };

        const mockClient = createHttpClient({
          fetch: mockFetch,
          retryDelay: () => 0,
          logger: null,
        });

        const backend = new RebrickableBackend({
          apiKey: 'test-api-key-123',
          cacheDir: tmpDir,
          httpClient: mockClient,
        });

        const res = await backend.enrich({
          cleanId: '42000',
          setNum: '42000-1',
          csvRecord: {},
        });

        assert.notStrictEqual(res, null);
        assert.strictEqual(res?.name, 'Grand Prix Racer');
        assert.strictEqual(res?.year, 2013);
        assert.strictEqual(res?.theme, 'Technic');
        assert.strictEqual(res?.pieces, 1141);
        assert.strictEqual(res?.imageUrl, 'https://example.com/42000.jpg');
        assert.strictEqual(authHeader, 'key test-api-key-123');

        // Check that cache files were written
        assert(fs.existsSync(path.join(tmpDir, 'set_42000-1.json')));
        assert(fs.existsSync(path.join(tmpDir, 'theme_1.json')));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('returns empty result when API returns 404', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebrickable-test-'));
      try {
        const mockFetch: typeof fetch = async () => {
          return new Response('Not Found', { status: 404 });
        };

        const mockClient = createHttpClient({
          fetch: mockFetch,
          retryDelay: () => 0,
          logger: null,
        });

        const backend = new RebrickableBackend({
          apiKey: 'test-api-key',
          cacheDir: tmpDir,
          httpClient: mockClient,
        });

        const res = await backend.enrich({
          cleanId: '00000',
          setNum: '00000-1',
          csvRecord: {},
        });

        assert.strictEqual(res, null);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
