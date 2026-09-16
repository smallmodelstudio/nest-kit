import { STATUS_CODES } from 'node:http';
import { HttpException } from '@nestjs/common';
import { ZodError } from 'zod';

export interface ErrorMapping {
  statusCode: number;
  message: string;
  error: string;
}

export interface ErrorMapper {
  supports(error: unknown): boolean;
  toResponse(error: unknown): ErrorMapping;
}

function isMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

export const httpExceptionMapper: ErrorMapper = {
  supports: (error) => error instanceof HttpException,
  toResponse(error) {
    const exception = error as HttpException;
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return { statusCode: status, message: body, error: exception.name };
    }

    // Most HttpExceptions carry a `{ message, error }` body (Nest's own
    // built-in exceptions, and everything an app throws directly). But
    // that's a convention, not something `HttpException` enforces — e.g.
    // Terminus's HealthCheckService throws a ServiceUnavailableException
    // whose body is the whole HealthCheckResult object, with its own
    // unrelated `error` key (failed checks, not an HTTP error name).
    // Falling back to the exception's own message/a STATUS_CODES lookup
    // keeps the envelope honest for any exception body shape, not just the
    // `{ message, error }` ones.
    const { message, error: bodyError } = body as {
      message?: unknown;
      error?: unknown;
    };
    const rawMessage = isMessage(message) ? message : exception.message;
    return {
      statusCode: status,
      message: Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage,
      error:
        typeof bodyError === 'string'
          ? bodyError
          : (STATUS_CODES[status] ?? exception.name),
    };
  },
};

export const zodErrorMapper: ErrorMapper = {
  supports: (error) => error instanceof ZodError,
  toResponse(error) {
    const zodError = error as ZodError;
    const message = zodError.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { statusCode: 400, message, error: 'Bad Request' };
  },
};

export const fallbackErrorMapping: ErrorMapping = {
  statusCode: 500,
  message: 'Internal server error',
  error: 'Internal Server Error',
};
