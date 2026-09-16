import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { NEST_HTTP_CLIENT } from './inject-http-client.decorator';
import { NestHttpService, type NestHttpServiceOptions } from './nest-http.service';

/**
 * `NestHttpModule.forRoot({ baseUrl, ... })` provides a `NestHttpService`,
 * injectable with `@InjectHttpClient()`. For config-driven options, compute
 * them synchronously first (e.g. from `process.env`, or by calling
 * `@smallmodelstudio/nest-config`'s `parseConfig()` directly — the same way
 * `ConfigKitModule.forRoot` itself does) and pass the result in here.
 */
@Module({})
export class NestHttpModule {
  static forRoot(options: NestHttpServiceOptions = {}): DynamicModule {
    return {
      module: NestHttpModule,
      providers: [
        { provide: NEST_HTTP_CLIENT, useFactory: () => new NestHttpService(options) },
      ],
      exports: [NEST_HTTP_CLIENT],
    };
  }
}
