import { randomUUID } from 'node:crypto';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch } from '@nestjs/common';
import type { ErrorEnvelope } from '@smallmodelstudio/contract';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  fallbackErrorMapping,
  httpExceptionMapper,
  upstreamErrorMapper,
  zodErrorMapper,
  type ErrorMapper,
} from './mapper';

/**
 * Catches every exception and responds with the `errorEnvelopeSchema` shape.
 * `extraMappers` are checked before the built-ins, so an app can override how
 * a given error type is reported.
 *
 * `getCorrelationId` (optional) supplies the response's correlation id —
 * e.g. `() => RequestContext.correlationId()` from
 * `@smallmodelstudio/nest-context`. `nest-errors` doesn't depend on
 * `nest-context` directly (packages in the same layer stay independent of
 * each other); without it, or when it returns `undefined`, a fresh id is
 * generated per response instead.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly mappers: ErrorMapper[];

  constructor(
    extraMappers: ErrorMapper[] = [],
    private readonly getCorrelationId?: () => string | undefined,
  ) {
    this.mappers = [...extraMappers, httpExceptionMapper, zodErrorMapper, upstreamErrorMapper];
  }

  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const mapper = this.mappers.find((candidate) => candidate.supports(error));
    const mapping = mapper ? mapper.toResponse(error) : fallbackErrorMapping;

    if (!mapper) {
      console.error(error);
    }

    const body: ErrorEnvelope = {
      statusCode: mapping.statusCode,
      message: mapping.message,
      error: mapping.error,
      path: request.url,
      timestamp: new Date().toISOString(),
      correlationId: this.getCorrelationId?.() ?? randomUUID(),
    };

    reply.status(mapping.statusCode).send(body);
  }
}
