import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mergeOpenApiComponents } from '@smallmodelstudio/contract';
import { TransformInterceptor } from '@smallmodelstudio/nest-envelope';
import { GlobalExceptionFilter } from '@smallmodelstudio/nest-errors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('nest-kit playground')
    .setDescription('Phase 1 core spike: posts served from an in-memory array.')
    .setVersion('0.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  mergeOpenApiComponents(document);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
