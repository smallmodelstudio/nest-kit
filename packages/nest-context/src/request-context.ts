import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextData {
  correlationId: string;
}

/**
 * Per-request data available anywhere in the async call graph a request
 * triggers, without threading it through every function signature.
 * `registerCorrelationIdHook` is the only thing that calls `run()`; anything
 * downstream (an interceptor, a filter, a logger) just calls `get()`.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  static run<T>(data: RequestContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  static get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  static correlationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }
}
