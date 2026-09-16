import type { NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * A composable piece of app setup that runs against the created app, before
 * it starts listening. `createApp`'s consumer supplies these — correlation
 * (`nest-context`), logging (`nest-logging`), Swagger, etc. — so
 * `nest-bootstrap` itself never has to depend on any of those packages.
 */
export interface BootstrapPlugin {
  configure(app: NestFastifyApplication): void | Promise<void>;
}
