import { HttpException, HttpStatus } from '@nestjs/common';
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

function httpStatusName(status: number): string {
  const key = HttpStatus[status];
  if (!key) return 'Error';
  return key
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export const httpExceptionMapper: ErrorMapper = {
  supports: (error) => error instanceof HttpException,
  toResponse(error) {
    const exception = error as HttpException;
    const status = exception.getStatus();
    const body = exception.getResponse();
    const rawMessage =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ??
          exception.message);
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('; ')
      : rawMessage;
    return { statusCode: status, message, error: httpStatusName(status) };
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
