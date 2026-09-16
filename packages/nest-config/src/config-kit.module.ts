import type { DynamicModule } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import type { z } from 'zod';
import { CONFIG_TOKEN } from './inject-config.decorator';
import { parseConfig } from './parse-config';

export interface ConfigKitModuleOptions<S extends z.ZodType> {
  schema: S;
  /** Defaults to `process.env`. Mainly for tests that don't want to mutate it. */
  source?: Record<string, string | undefined>;
}

/**
 * `ConfigKitModule.forRoot({ schema })` parses `process.env` once, at
 * startup, through a Zod schema whose own `.transform()` builds whatever
 * nested shape the app wants — replacing a separate validation class and a
 * separate env-to-config mapping function with the one schema. The result is
 * provided as a plain value; inject it with `@InjectConfig()`.
 */
@Global()
@Module({})
export class ConfigKitModule {
  static forRoot<S extends z.ZodType>(
    options: ConfigKitModuleOptions<S>,
  ): DynamicModule {
    const config = parseConfig(options.schema, options.source);
    return {
      module: ConfigKitModule,
      providers: [{ provide: CONFIG_TOKEN, useValue: config }],
      exports: [CONFIG_TOKEN],
    };
  }
}
