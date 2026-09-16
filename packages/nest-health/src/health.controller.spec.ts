import { describe, it, beforeEach, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HEALTH_READY_INDICATORS } from './health-indicators.token';
import { DRAIN_DELAY_MS, ReadinessGate } from './readiness-gate';

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: Mock };
  let readiness: ReadinessGate;

  const compile = async (indicators: unknown[] = []): Promise<void> => {
    health = { check: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        ReadinessGate,
        { provide: HEALTH_READY_INDICATORS, useValue: indicators },
        { provide: DRAIN_DELAY_MS, useValue: 1 },
      ],
    }).compile();

    controller = module.get(HealthController);
    readiness = module.get(ReadinessGate);
  };

  beforeEach(() => compile());

  describe('live', () => {
    it('checks no indicators, so it never depends on anything downstream', async () => {
      const result = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      };
      health.check.mockResolvedValueOnce(result);

      const response = await controller.live();

      expect(response).toBe(result);
      expect(health.check).toHaveBeenCalledWith([]);
    });
  });

  describe('ready', () => {
    it('runs the injected indicators via HealthCheckService', async () => {
      const indicator = vi
        .fn()
        .mockResolvedValue({ upstream: { status: 'up' } });
      await compile([indicator]);
      const result = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      };
      health.check.mockResolvedValueOnce(result);

      const response = await controller.ready();

      expect(response).toBe(result);
      expect(health.check).toHaveBeenCalledWith([indicator]);
    });

    it('rethrows a failed check with a message naming the failed check', async () => {
      const failure = new ServiceUnavailableException({
        status: 'error',
        info: {},
        error: { upstream: { status: 'down' } },
        details: {},
      });
      health.check.mockRejectedValueOnce(failure);

      await expect(controller.ready()).rejects.toMatchObject({
        message: 'Health check failed: upstream',
      });
    });

    it('rethrows a non-Terminus error unchanged', async () => {
      const error = new Error('boom');
      health.check.mockRejectedValueOnce(error);

      await expect(controller.ready()).rejects.toBe(error);
    });

    it('fails immediately, without running indicators, once the readiness gate is closed', async () => {
      // Deliberately not awaited: `ready` flips to false synchronously,
      // before the drain-delay `await` inside beforeApplicationShutdown().
      void readiness.beforeApplicationShutdown();

      await expect(controller.ready()).rejects.toThrow('Shutting down');
      expect(health.check).not.toHaveBeenCalled();
    });
  });
});
