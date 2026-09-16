import { z } from 'zod';

export const configSchema = z
  .object({
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    CACHE_TTL_MS: z.coerce.number().int().min(0).default(60_000),
  })
  .transform((env) => ({
    port: env.PORT,
    cache: { ttlMs: env.CACHE_TTL_MS },
  }));

export type AppConfig = z.infer<typeof configSchema>;
