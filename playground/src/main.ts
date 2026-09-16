import 'reflect-metadata';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mergeOpenApiComponents } from '@smallmodelstudio/contract';
import { createApp } from '@smallmodelstudio/nest-bootstrap';
import { CONFIG_TOKEN } from '@smallmodelstudio/nest-config';
import { registerCorrelationIdHook } from '@smallmodelstudio/nest-context';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { AppConfig } from './config';

async function bootstrap(): Promise<void> {
  const app = await createApp(AppModule, {
    plugins: [
      {
        configure: (app: NestFastifyApplication) =>
          registerCorrelationIdHook(app.getHttpAdapter().getInstance()),
      },
    ],
  });

  // Swaps Nest's default console Logger for pino app-wide, same as main.ts
  // in the harness this package's `nest-logging` was extracted from.
  app.useLogger(app.get(Logger));

  const config = app.get<AppConfig>(CONFIG_TOKEN);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('nest-kit playground')
    .setDescription(
      'Phase 2 extract: posts served from an in-memory array, on top of ' +
        'nest-context, nest-config, nest-logging, nest-cache, nest-metrics, ' +
        'nest-health and nest-bootstrap.',
    )
    .setVersion('0.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  mergeOpenApiComponents(document);
  SwaggerModule.setup('docs', app, document);

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

void bootstrap();
