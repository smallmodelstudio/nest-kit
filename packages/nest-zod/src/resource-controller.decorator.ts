import { applyDecorators, Controller } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  errorEnvelopeSchema,
  toOpenApiSchema,
} from '@smallmodelstudio/contract';
import type { AnyResourceContract } from './any-resource-contract';

/** `@Controller(resource.path)` + `@ApiTags` + a shared error-envelope response doc. */
export function ResourceController(
  resource: AnyResourceContract,
): ClassDecorator {
  const tag = resource.path.replace(/^\//, '') || 'root';
  return applyDecorators(
    Controller(resource.path),
    ApiTags(tag),
    ApiResponse({
      status: 'default',
      description: 'Error',
      schema: toOpenApiSchema(errorEnvelopeSchema),
    }),
  );
}
