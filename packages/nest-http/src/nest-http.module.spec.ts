import type { FactoryProvider } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { NEST_HTTP_CLIENT } from './inject-http-client.decorator';
import { NestHttpModule } from './nest-http.module';
import { NestHttpService } from './nest-http.service';

describe('NestHttpModule.forRoot', () => {
  it('provides a NestHttpService under NEST_HTTP_CLIENT', () => {
    const dynamicModule = NestHttpModule.forRoot({ baseUrl: 'https://api.test' });

    expect(dynamicModule.exports).toEqual([NEST_HTTP_CLIENT]);
    const provider = dynamicModule.providers?.[0] as FactoryProvider;
    expect(provider.provide).toBe(NEST_HTTP_CLIENT);
    expect(provider.useFactory()).toBeInstanceOf(NestHttpService);
  });
});
