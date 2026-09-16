import type { SchemaObject } from '@nestjs/swagger';

// nest-health doesn't import nest-envelope (packages in the same layer stay
// independent of each other), so its Swagger docs build the envelope shape
// directly as plain JSON Schema instead — the same shape nest-envelope's
// `TransformInterceptor` produces at runtime, and its own Swagger helper
// documents for every other route.
const metaSchema: SchemaObject = {
  type: 'object',
  properties: {
    timestamp: { type: 'string', format: 'date-time' },
    correlationId: { type: 'string' },
  },
  required: ['timestamp', 'correlationId'],
};

export function envelopeSchema(dataSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    properties: { data: dataSchema, meta: metaSchema },
    required: ['data', 'meta'],
  };
}

export const errorEnvelopeSchema: SchemaObject = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    message: { type: 'string' },
    error: { type: 'string' },
    path: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    correlationId: { type: 'string' },
  },
  required: [
    'statusCode',
    'message',
    'error',
    'path',
    'timestamp',
    'correlationId',
  ],
};

export const healthResultSchema: SchemaObject = {
  type: 'object',
  properties: {
    status: { type: 'string', example: 'ok' },
    info: { type: 'object', additionalProperties: true, nullable: true },
    error: { type: 'object', additionalProperties: true, nullable: true },
    details: { type: 'object', additionalProperties: true },
  },
};
