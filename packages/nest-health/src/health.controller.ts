import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  HealthCheckResult,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import {
  errorEnvelopeSchema,
  envelopeSchema,
  healthResultSchema,
} from './health-schema';
import { HEALTH_READY_INDICATORS } from './health-indicators.token';
import { ReadinessGate } from './readiness-gate';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly readiness: ReadinessGate,
    @Optional()
    @Inject(HEALTH_READY_INDICATORS)
    private readonly indicators: HealthIndicatorFunction[] = [],
  ) {}

  // Terminus's own @HealthCheck() would otherwise auto-document a bare
  // HealthCheckResult, but these routes flow through the same envelope as
  // everything else — its swagger docs are disabled here in favor of the
  // explicit, envelope-aware ones below.

  @Get('live')
  @HealthCheck({ swaggerDocumentation: false })
  @ApiResponse({
    status: 200,
    description: 'The process is up.',
    schema: envelopeSchema(healthResultSchema),
  })
  // No indicators: liveness must never fail because of a downstream fault,
  // or Kubernetes would restart every pod in a loop for something none of
  // them can fix.
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck({ swaggerDocumentation: false })
  @ApiResponse({
    status: 200,
    description: 'The app is ready to receive traffic.',
    schema: envelopeSchema(healthResultSchema),
  })
  @ApiResponse({
    status: 503,
    description: 'A readiness check failed, or shutdown is in progress.',
    schema: errorEnvelopeSchema,
  })
  async ready(): Promise<HealthCheckResult> {
    // Flipped by ReadinessGate.beforeApplicationShutdown() — checked first
    // so a pod draining on SIGTERM fails fast without waiting on indicators
    // that may themselves be mid-shutdown.
    if (!this.readiness.isReady()) {
      throw new ServiceUnavailableException('Shutting down');
    }

    try {
      return await this.health.check(this.indicators);
    } catch (error) {
      // HealthCheckService's own exception carries the whole
      // HealthCheckResult as its body, not a string message — left as-is,
      // it would reach the app's exception filter's generic fallback and
      // produce a vague "Service Unavailable Exception". Naming the failed
      // check here instead makes the error envelope's `message` actually
      // say what's wrong.
      if (error instanceof ServiceUnavailableException) {
        const result = error.getResponse() as HealthCheckResult;
        const failedChecks = Object.keys(result.error ?? {});
        throw new ServiceUnavailableException(
          failedChecks.length > 0
            ? `Health check failed: ${failedChecks.join(', ')}`
            : 'Health check failed',
        );
      }
      throw error;
    }
  }
}
