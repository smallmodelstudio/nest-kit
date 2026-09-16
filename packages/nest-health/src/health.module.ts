import type { DynamicModule, Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DRAIN_DELAY_MS, ReadinessGate } from './readiness-gate';

export interface NestHealthModuleOptions {
  /**
   * How long `/health/ready` keeps failing before Nest is allowed to close
   * the HTTP server on shutdown (see `ReadinessGate`). Defaults to 5000ms.
   */
  drainDelayMs?: number;
}

/**
 * `/health/live` (always passes) and `/health/ready` (fails during the
 * shutdown drain window, plus whatever you provide under
 * `HEALTH_READY_INDICATORS` — e.g. an upstream ping from `nest-http`).
 */
@Module({})
export class NestHealthModule {
  static forRoot(options: NestHealthModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [ReadinessGate];
    if (options.drainDelayMs !== undefined) {
      providers.push({
        provide: DRAIN_DELAY_MS,
        useValue: options.drainDelayMs,
      });
    }

    return {
      module: NestHealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers,
      exports: [ReadinessGate],
    };
  }
}
