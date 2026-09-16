import { Injectable } from '@nestjs/common';
import {
  HttpClient,
  type HttpClientOptions,
  type HttpMethod,
  type RequestOptions,
} from '@smallmodelstudio/http-client';
import { recordRetry } from './http-client-metrics';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface NestHttpServiceOptions extends HttpClientOptions {
  /**
   * Supplies the outgoing `x-correlation-id` header, read fresh per request —
   * e.g. `() => RequestContext.correlationId()` from
   * `@smallmodelstudio/nest-context`. `nest-http` doesn't depend on
   * `nest-context` directly (packages in the same layer stay independent of
   * each other); without it, or when it returns `undefined`, no correlation
   * id is sent.
   */
  getCorrelationId?: () => string | undefined;
}

function resolveHeaders(headers: HttpClientOptions['headers']): Headers {
  return new Headers(typeof headers === 'function' ? headers() : headers);
}

/**
 * Wraps `@smallmodelstudio/http-client`'s `HttpClient` for use inside a Nest
 * app: forwards `x-correlation-id`, and records a
 * `http_client_retries_total` counter for every retried attempt.
 */
@Injectable()
export class NestHttpService {
  private readonly client: HttpClient;

  constructor(options: NestHttpServiceOptions = {}) {
    const { getCorrelationId, onRetry, headers, ...rest } = options;
    this.client = new HttpClient({
      ...rest,
      headers: () => {
        const resolved = resolveHeaders(headers);
        const correlationId = getCorrelationId?.();
        if (correlationId) {
          resolved.set(CORRELATION_ID_HEADER, correlationId);
        }
        return resolved;
      },
      onRetry: (info) => {
        recordRetry(info.method);
        onRetry?.(info);
      },
    });
  }

  request<T = unknown>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<T> {
    return this.client.request<T>(method, path, options);
  }

  get<T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.client.get<T>(path, options);
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<T> {
    return this.client.post<T>(path, body, options);
  }

  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<T> {
    return this.client.put<T>(path, body, options);
  }

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<T> {
    return this.client.patch<T>(path, body, options);
  }

  delete<T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.client.delete<T>(path, options);
  }
}
