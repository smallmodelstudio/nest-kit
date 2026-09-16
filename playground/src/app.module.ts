import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CONFIG_TOKEN, ConfigKitModule } from '@smallmodelstudio/nest-config';
import { RequestContext } from '@smallmodelstudio/nest-context';
import { HttpCacheInterceptor } from '@smallmodelstudio/nest-cache';
import { GlobalExceptionFilter } from '@smallmodelstudio/nest-errors';
import { TransformInterceptor } from '@smallmodelstudio/nest-envelope';
import { NestHealthModule } from '@smallmodelstudio/nest-health';
import { NestKitLoggerModule } from '@smallmodelstudio/nest-logging';
import { MetricsInterceptor } from '@smallmodelstudio/nest-metrics';
import { configSchema, type AppConfig } from './config';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    ConfigKitModule.forRoot({ schema: configSchema }),
    NestKitLoggerModule.forRoot({
      getCorrelationId: () => RequestContext.correlationId(),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [CONFIG_TOKEN],
      useFactory: (config: AppConfig) => ({ ttl: config.cache.ttlMs }),
    }),
    NestHealthModule.forRoot({ drainDelayMs: 1000 }),
    PostsModule,
  ],
  providers: [
    // Bound outermost to innermost: Transform must see the raw handler
    // result before it's enveloped, whether that result came from the
    // handler or the cache, so every response — cache hits included — gets
    // a fresh timestamp and correlation id; Cache sits next so a hit
    // short-circuits the metrics interceptor and the handler both.
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        new TransformInterceptor(() => RequestContext.correlationId()),
    },
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    {
      provide: APP_FILTER,
      useFactory: () =>
        new GlobalExceptionFilter([], () => RequestContext.correlationId()),
    },
  ],
})
export class AppModule {}
