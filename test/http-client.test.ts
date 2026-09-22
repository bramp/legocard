import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createHttpClient,
  fetchWithRetry,
  DEFAULT_USER_AGENT,
  HTTPError,
  NetworkError,
} from '../scripts/backends/http-client.js';

describe('HTTP Client (ky wrapper)', () => {
  it('executes successful GET request and applies default User-Agent header', async () => {
    let requestedUrl = '';
    let requestedHeaders: Headers | undefined;

    const mockFetch: typeof fetch = async (input, init) => {
      requestedUrl = input instanceof Request ? input.url : String(input);
      requestedHeaders = input instanceof Request ? input.headers : new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createHttpClient({
      fetch: mockFetch,
      retryDelay: () => 0,
      logger: null,
    });

    const res = await client.get('https://example.com/api/test').json<{ ok: boolean }>();
    assert.deepStrictEqual(res, { ok: true });
    assert.strictEqual(requestedUrl, 'https://example.com/api/test');
    assert.strictEqual(requestedHeaders?.get('User-Agent'), DEFAULT_USER_AGENT);
  });

  it('merges custom headers with default headers', async () => {
    let requestedHeaders: Headers | undefined;

    const mockFetch: typeof fetch = async (input, init) => {
      requestedHeaders = input instanceof Request ? input.headers : new Headers(init?.headers);
      return new Response('{"ok":true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createHttpClient({
      headers: {
        Authorization: 'key secret-123',
      },
      fetch: mockFetch,
      retryDelay: () => 0,
      logger: null,
    });

    await client.get('https://example.com/data').json();
    assert.strictEqual(requestedHeaders?.get('User-Agent'), DEFAULT_USER_AGENT);
    assert.strictEqual(requestedHeaders?.get('Authorization'), 'key secret-123');
  });

  it('executes POST request with URLSearchParams body', async () => {
    let method = '';
    let bodyText = '';

    const mockFetch: typeof fetch = async (input, init) => {
      method = input instanceof Request ? input.method : (init?.method || '');
      bodyText = input instanceof Request ? await input.clone().text() : String(init?.body);
      return new Response('{"status":"created"}', {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createHttpClient({
      fetch: mockFetch,
      retryDelay: () => 0,
      logger: null,
    });

    const params = new URLSearchParams({ setNumber: '10234' });
    const res = await client
      .post('https://example.com/items', { body: params })
      .json<{ status: string }>();

    assert.strictEqual(res.status, 'created');
    assert.strictEqual(method, 'POST');
    assert.strictEqual(bodyText, 'setNumber=10234');
  });

  it('handles 429 rate limit with Retry-After header and retries', async () => {
    let attempts = 0;

    const mockFetch: typeof fetch = async () => {
      attempts++;
      if (attempts === 1) {
        return new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '0' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createHttpClient({
      fetch: mockFetch,
      retryDelay: () => 0,
      logger: null,
    });

    const res = await client.get('https://example.com/throttled').json<{ success: boolean }>();
    assert.deepStrictEqual(res, { success: true });
    assert.strictEqual(attempts, 2);
  });

  it('retries 500 and 503 transient server errors and succeeds', async () => {
    let attempts = 0;

    const mockFetch: typeof fetch = async () => {
      attempts++;
      if (attempts === 1) {
        return new Response('Internal Server Error', { status: 500 });
      }
      if (attempts === 2) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify({ recovered: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createHttpClient({
      fetch: mockFetch,
      maxRetries: 3,
      retryDelay: () => 0,
      logger: null,
    });

    const res = await client.get('https://example.com/flaky').json<{ recovered: boolean }>();
    assert.deepStrictEqual(res, { recovered: true });
    assert.strictEqual(attempts, 3);
  });

  it('fails fast on non-retryable 4xx client errors (e.g. 404) without retrying', async () => {
    let attempts = 0;

    const mockFetch: typeof fetch = async () => {
      attempts++;
      return new Response('Not Found', { status: 404 });
    };

    const client = createHttpClient({
      fetch: mockFetch,
      retryDelay: () => 0,
      logger: null,
    });

    await assert.rejects(
      async () => {
        await client.get('https://example.com/not-found');
      },
      (err: unknown) => {
        return err instanceof HTTPError && err.response.status === 404;
      }
    );

    assert.strictEqual(attempts, 1);
  });

  it('retries network transport errors and exhausts retries', async () => {
    let attempts = 0;

    const mockFetch: typeof fetch = async () => {
      attempts++;
      throw new TypeError('fetch failed');
    };

    const client = createHttpClient({
      fetch: mockFetch,
      maxRetries: 2,
      retryDelay: () => 0,
      logger: null,
    });

    await assert.rejects(
      async () => {
        await client.get('https://example.com/down');
      },
      (err: unknown) => {
        return err instanceof NetworkError;
      }
    );

    // Initial attempt + 2 retries = 3 total attempts
    assert.strictEqual(attempts, 3);
  });

  it('fetchWithRetry utility performs request', async () => {
    const res = await fetchWithRetry('https://example.com/test', {
      fetch: async () => new Response('ok', { status: 200 }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'ok');
  });
});
