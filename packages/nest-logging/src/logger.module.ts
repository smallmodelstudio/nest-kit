import type { DynamicModule } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import {
  customLogLevel,
  defaultLevel,
  isPinoPrettyAvailable,
} from './pino-options';

export interface NestKitLoggerModuleOptions {
  /** Overrides the NODE_ENV-derived default (see `defaultLevel`). */
  level?: string;
  /**
   * Reads the current request's correlation id, if any — e.g.
   * `RequestContext.correlationId` from `@smallmodelstudio/nest-context`.
   * `nest-logging` doesn't depend on `nest-context` directly (packages in
   * the same layer stay independent of each other), so the caller wires
   * this in. Logged on every access-log line via pino-http's `customProps`.
   */
  getCorrelationId?: () => string | undefined;
}

/**
 * Wraps `nestjs-pino`'s `LoggerModule`: level by environment (silent in
 * test), `pino-pretty` only when it's actually resolvable, log level bumped
 * by response status, and the correlation id on every access-log line.
 */
@Global()
@Module({})
export class NestKitLoggerModule {
  static forRoot(options: NestKitLoggerModuleOptions = {}): DynamicModule {
    const level = options.level ?? defaultLevel();
    const inner = LoggerModule.forRoot({
      pinoHttp: {
        level,
        ...(isPinoPrettyAvailable() && {
          transport: { target: 'pino-pretty' },
        }),
        customLogLevel,
        customProps: () => ({ correlationId: options.getCorrelationId?.() }),
      },
    });

    return {
      module: NestKitLoggerModule,
      imports: [inner],
      exports: [inner],
    };
  }
}
