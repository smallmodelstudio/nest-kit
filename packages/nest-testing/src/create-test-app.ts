import type { DynamicModule, Type } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  createFastifyAdapter,
  type BootstrapPlugin,
} from '@smallmodelstudio/nest-bootstrap';

export interface CreateTestAppOptions {
  plugins?: BootstrapPlugin[];
  /**
   * Escape hatch for a test that needs to swap a provider out entirely
   * (e.g. mocking an upstream service directly instead of going through
   * `nock`). For config values, prefer `withEnvOverrides` where possible.
   */
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

/**
 * Boots `module` the same way `@smallmodelstudio/nest-bootstrap`'s
 * `createApp` would — same Fastify adapter, same plugins — so a test app
 * can't quietly drift from what `main.ts` actually runs.
 */
export async function createTestApp(
  module: Type<unknown> | DynamicModule,
  options: CreateTestAppOptions = {},
): Promise<NestFastifyApplication> {
  let builder = Test.createTestingModule({ imports: [module] });
  if (options.configure) {
    builder = options.configure(builder);
  }

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    createFastifyAdapter(),
  );

  for (const plugin of options.plugins ?? []) {
    await plugin.configure(app);
  }

  await app.init();
  // Fastify's underlying server isn't routable until it has finished its own
  // async boot — supertest hitting getHttpServer() before this resolves
  // sees connection resets.
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
