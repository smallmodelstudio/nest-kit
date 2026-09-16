import type { ResourceContract } from '@smallmodelstudio/contract';
import type { z } from 'zod';

/** A resource contract with its type parameters widened, for decorators that work with any resource. */
export type AnyResourceContract = ResourceContract<
  z.ZodType,
  z.ZodObject,
  z.ZodObject,
  'offset' | undefined
>;
