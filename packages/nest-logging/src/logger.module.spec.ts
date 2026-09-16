import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { describe, expect, it } from 'vitest';
import { NestKitLoggerModule } from './logger.module';

describe('NestKitLoggerModule', () => {
  it('makes nestjs-pino Logger injectable', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [NestKitLoggerModule.forRoot({ level: 'silent' })],
    }).compile();

    expect(moduleRef.get(Logger)).toBeInstanceOf(Logger);
  });

  it('defaults to the NODE_ENV-derived level without an explicit option', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [NestKitLoggerModule.forRoot()],
    }).compile();

    expect(moduleRef.get(Logger)).toBeInstanceOf(Logger);
  });
});
