/**
 * Standardized HTTP client built on `ky` with automatic retries, HTTP 429 backoff,
 * timeouts, default headers, and custom fetch injection.
 */
import ky, {
  type KyInstance,
  type Options as KyOptions,
  HTTPError,
  TimeoutError,
  NetworkError,
} from 'ky';

export { ky, HTTPError, TimeoutError, NetworkError, type KyInstance, type KyOptions };

export interface HttpLogger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  info?(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void;
}

export interface HttpClientOptions {
  /** Optional base URL to prefix relative request paths */
  baseUrl?: string;
  /** Default headers to attach to every outgoing request */
  headers?: Record<string, string>;
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries?: number;
  /** Per-request timeout in milliseconds. Default: 15000 (15s) */
  timeoutMs?: number;
  /** Custom retry delay calculator (e.g. `() => 0` for instant unit tests) */
  retryDelay?: (attemptCount: number) => number;
  /** Custom fetch implementation (for unit testing or custom transport) */
  fetch?: typeof fetch;
  /** Logger for rate limit and retry warnings. Pass null to silence logs. */
  logger?: HttpLogger | null;
}

export const DEFAULT_USER_AGENT = 'bricknook/1.0 (https://bricknook.me)';

const RETRY_METHODS = ['get', 'post', 'put', 'head', 'delete', 'options', 'trace'] as const;
const RETRY_STATUS_CODES = [408, 413, 429, 500, 502, 503, 504];

/**
 * Creates a configured `ky` HTTP client instance with consistent defaults,
 * exponential backoff, 429 Retry-After handling, and optional logging.
 */
export function createHttpClient(options: HttpClientOptions = {}): KyInstance {
  const logger = options.logger === null ? null : (options.logger || console);

  return ky.create({
    baseUrl: options.baseUrl,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      ...(options.headers || {}),
    },
    timeout: options.timeoutMs ?? 15000,
    fetch: options.fetch,
    retry: {
      limit: options.maxRetries ?? 3,
      methods: RETRY_METHODS as unknown as string[],
      statusCodes: RETRY_STATUS_CODES,
      backoffLimit: 30000,
      ...(options.retryDelay ? { delay: options.retryDelay } : {}),
    },
    hooks: {
      beforeRetry: [
        async ({ request, error, retryCount }) => {
          if (!logger) return;
          const status = (error as HTTPError)?.response?.status;
          if (status === 429) {
            logger.warn(
              `[Rate Limit] 429 for ${request.url} (attempt ${retryCount}), backing off...`
            );
          } else {
            logger.warn(
              `[HTTP Retry] ${request.url} error: ${error.message} (attempt ${retryCount}), retrying...`
            );
          }
        },
      ],
    },
  });
}

/** Global default client instance */
export const defaultHttpClient: KyInstance = createHttpClient();

/**
 * Top-level helper to perform an HTTP request with automatic retries and 429 backoff.
 */
export async function fetchWithRetry(
  input: string | URL | Request,
  options?: KyOptions
): Promise<Response> {
  return defaultHttpClient(input, options);
}
