import { backoffDelayMs, isSafeMethod, type BackoffOptions, type HttpMethod } from './retry';
import { UpstreamError } from './upstream-error';

// @types/node doesn't declare a global `HeadersInit` (unlike `Headers`,
// `Response` and `RequestInit`, which it does), so this reconstructs the
// equivalent from the one place it's guaranteed to be accurate: the
// constructor it feeds.
export type HeadersInit = ConstructorParameters<typeof Headers>[0];

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: HeadersInit;
}

export interface RetryInfo {
  method: HttpMethod;
  path: string;
  /** 1 for the first retry, 2 for the second, … */
  attempt: number;
  error: unknown;
}

export interface HttpClientOptions {
  baseUrl?: string;
  /** Per-attempt timeout in ms. Defaults to 10000. */
  timeoutMs?: number;
  /** Max retries for safe methods (GET, HEAD, OPTIONS, PUT, DELETE) on a retryable failure. Defaults to 2. */
  retries?: number;
  /** Sent on every request. A function is called fresh per attempt, so it can supply a per-request value like a correlation id. */
  headers?: HeadersInit | (() => HeadersInit);
  /** Defaults to the global `fetch`. Override in tests. */
  fetch?: typeof fetch;
  backoff?: BackoffOptions;
  /** Called before each retried attempt (not the first). */
  onRetry?: (info: RetryInfo) => void;
}

function resolveHeadersInit(
  headers?: HeadersInit | (() => HeadersInit),
): HeadersInit | undefined {
  return typeof headers === 'function' ? headers() : headers;
}

function mergeHeaders(
  base: HeadersInit | (() => HeadersInit) | undefined,
  extra: HeadersInit | undefined,
): Headers {
  const merged = new Headers(resolveHeadersInit(base));
  if (extra) {
    for (const [key, value] of new Headers(extra)) {
      merged.set(key, value);
    }
  }
  return merged;
}

function buildUrl(
  baseUrl: string | undefined,
  path: string,
  query: RequestOptions['query'],
): URL {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

// A response is only retried past a network failure or a timeout when it's a
// 5xx: retrying a 4xx (bad request, not found, …) would just get the same
// answer again, even for an idempotent method.
function isRetryable(error: unknown): boolean {
  if (!(error instanceof UpstreamError)) {
    return false;
  }
  return error.kind !== 'BAD_RESPONSE' || (error.status ?? 0) >= 500;
}

/**
 * `fetch`-based HTTP client. Retries only safe methods (GET, HEAD, OPTIONS,
 * PUT, DELETE) with full-jitter exponential backoff, times out each attempt
 * individually via `AbortSignal`, and maps every failure to an
 * `UpstreamError`.
 */
export class HttpClient {
  private readonly baseUrl: string | undefined;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly headers: HttpClientOptions['headers'];
  private readonly fetchFn: typeof fetch;
  private readonly backoff: BackoffOptions;
  private readonly onRetry: HttpClientOptions['onRetry'];

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retries = options.retries ?? 2;
    this.headers = options.headers;
    this.fetchFn = options.fetch ?? fetch;
    this.backoff = options.backoff ?? {};
    this.onRetry = options.onRetry;
  }

  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const maxAttempts = isSafeMethod(method) ? this.retries + 1 : 1;

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(backoffDelayMs(attempt - 1, this.backoff));
        this.onRetry?.({ method, path, attempt, error: lastError });
      }
      try {
        return await this.attempt<T>(method, url, options);
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }
    // Unreachable: the loop above always either returns or throws.
    throw lastError;
  }

  get<T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  delete<T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  private async attempt<T>(method: HttpMethod, url: URL, options: RequestOptions): Promise<T> {
    const headers = mergeHeaders(this.headers, options.headers);
    const hasBody = options.body !== undefined;
    if (hasBody && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    };
    if (hasBody) {
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, init);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new UpstreamError(
          'TIMEOUT',
          `Request to ${url.toString()} timed out after ${this.timeoutMs}ms`,
          { cause: error },
        );
      }
      throw new UpstreamError(
        'NETWORK_ERROR',
        `Request to ${url.toString()} failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    const body = await parseBody(response);

    if (!response.ok) {
      throw new UpstreamError(
        'BAD_RESPONSE',
        `Request to ${url.toString()} returned ${response.status}`,
        { status: response.status, body },
      );
    }

    return body as T;
  }
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  return new HttpClient(options);
}
