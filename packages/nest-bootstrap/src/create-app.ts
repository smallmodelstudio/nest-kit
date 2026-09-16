import { NestFactory } from '@nestjs/core';
import type { IEntryNestModule } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { BootstrapPlugin } from './bootstrap-plugin';

export interface CreateAppOptions {
  plugins?: BootstrapPlugin[];
}

// Trust exactly the reverse proxy directly in front of the app, so a guard
// keying on `request.ip` (e.g. a rate limiter) sees the real client IP from
// X-Forwarded-For instead of the proxy's own address. Read directly from
// `process.env`, not from `nest-config`: this runs before Nest's DI
// container exists, and `nest-bootstrap` can't depend on `nest-config`
// anyway (packages in the same layer stay independent of each other). Off
// by default — trusting a client-supplied X-Forwarded-For with no proxy in
// front would let a client spoof its own rate-limit identity.
export function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: process.env['TRUST_PROXY'] === 'true',
  });
}

/**
 * Builds a `NestFastifyApplication` on the shared Fastify adapter, runs
 * every plugin's `configure()` in order, and enables shutdown hooks — used
 * by both a service's `main.ts` and `nest-testing`'s `createTestApp` so the
 * two can't drift apart. Swagger setup and `app.listen()` are still the
 * caller's own job: they're specific to `main.ts`, not to a test app.
 */
export async function createApp(
  module: IEntryNestModule,
  options: CreateAppOptions = {},
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    module,
    createFastifyAdapter(),
    { bufferLogs: true },
  );

  for (const plugin of options.plugins ?? []) {
    await plugin.configure(app);
  }

  app.enableShutdownHooks();
  return app;
}
