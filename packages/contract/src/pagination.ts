import { z } from 'zod';
import { zStrictInt } from './ids';

export const pageInfoSchema = z.object({
  offset: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export type PageInfo = z.infer<typeof pageInfoSchema>;

/** Query fields added to a resource's list query when `pagination: 'offset'`. */
export const offsetQueryFields = {
  offset: zStrictInt({ min: 0 }).optional().default(0),
  limit: zStrictInt({ min: 1, max: 100 }).optional().default(20),
};
