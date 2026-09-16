import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OperationConfig<
  TParams extends z.ZodType | undefined = z.ZodType | undefined,
  TQuery extends z.ZodType | undefined = z.ZodType | undefined,
  TBody extends z.ZodType | undefined = z.ZodType | undefined,
  TResponse extends z.ZodType = z.ZodType,
> {
  method: HttpMethod;
  path: string;
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  response: TResponse;
}

/** Describes a route that isn't part of a resource's CRUD operations. */
export function defineOperation<
  TParams extends z.ZodType | undefined,
  TQuery extends z.ZodType | undefined,
  TBody extends z.ZodType | undefined,
  TResponse extends z.ZodType,
>(
  config: OperationConfig<TParams, TQuery, TBody, TResponse>,
): OperationConfig<TParams, TQuery, TBody, TResponse> {
  return config;
}
