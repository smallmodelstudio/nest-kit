import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConfigKitModule } from './config-kit.module';
import { InjectConfig } from './inject-config.decorator';

const schema = z
  .object({ PORT: z.coerce.number().int().default(3000) })
  .transform((env) => ({ port: env.PORT }));

type AppConfig = z.infer<typeof schema>;

@Injectable()
class Consumer {
  constructor(@InjectConfig() readonly config: AppConfig) {}
}

describe('ConfigKitModule', () => {
  it('provides the schema-parsed config for injection', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigKitModule.forRoot({ schema, source: { PORT: '4000' } })],
      providers: [Consumer],
    }).compile();

    const consumer = moduleRef.get(Consumer);

    expect(consumer.config).toEqual({ port: 4000 });
  });

  it('throws at registration time when the source is invalid', () => {
    expect(() =>
      ConfigKitModule.forRoot({
        schema: z.object({ PORT: z.coerce.number() }),
        source: { PORT: 'nope' },
      }),
    ).toThrow(/Invalid environment variables/);
  });
});
