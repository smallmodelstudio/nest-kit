import { Inject } from '@nestjs/common';

export const NEST_HTTP_CLIENT = Symbol('NEST_HTTP_CLIENT');

/** Injects the `NestHttpService` provided by `NestHttpModule.forRoot()`. */
export function InjectHttpClient(): ParameterDecorator {
  return Inject(NEST_HTTP_CLIENT);
}
