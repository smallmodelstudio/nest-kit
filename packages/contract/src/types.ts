import type { z } from 'zod';
import type { ResourceContract } from './resource';

export type ResourceTypes<
  R extends ResourceContract<
    z.ZodType,
    z.ZodObject,
    z.ZodObject,
    'offset' | undefined
  >,
> = {
  entity: z.infer<R['entity']>;
  create: z.infer<R['create']>;
  patch: Partial<z.infer<R['create']>>;
  query: z.infer<R['listQuery']>;
};
