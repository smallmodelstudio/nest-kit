import type { BeforeApplicationShutdown } from '@nestjs/common';
import { Inject, Injectable, Optional } from '@nestjs/common';

export const DRAIN_DELAY_MS = Symbol('NEST_HEALTH_DRAIN_DELAY_MS');
export const DEFAULT_DRAIN_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Backs `/health/ready`'s pass/fail state, and drains traffic on shutdown.
 *
 * Nest calls `beforeApplicationShutdown` on every SIGTERM/SIGINT (once
 * `app.enableShutdownHooks()` is on) *before* it closes the HTTP server —
 * flipping `isReady()` to false here means `/health/ready` starts failing
 * immediately, so Kubernetes stops routing new traffic to this pod. Nest
 * then waits for this hook to resolve before it actually closes the server,
 * so the `sleep` below is what buys the drain window: long enough for the
 * readiness change to propagate and in-flight requests to finish before the
 * server stops accepting connections at all.
 */
@Injectable()
export class ReadinessGate implements BeforeApplicationShutdown {
  private ready = true;

  constructor(
    @Optional()
    @Inject(DRAIN_DELAY_MS)
    private readonly drainDelayMs: number = DEFAULT_DRAIN_DELAY_MS,
  ) {}

  isReady(): boolean {
    return this.ready;
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.ready = false;
    await sleep(this.drainDelayMs);
  }
}
