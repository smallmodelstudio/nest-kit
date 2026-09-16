import { describe, expect, it } from 'vitest';
import { ReadinessGate } from './readiness-gate';

describe('ReadinessGate', () => {
  it('starts ready', () => {
    expect(new ReadinessGate(1).isReady()).toBe(true);
  });

  it('flips to not-ready synchronously, before the drain delay resolves', () => {
    const gate = new ReadinessGate(50);

    void gate.beforeApplicationShutdown();

    expect(gate.isReady()).toBe(false);
  });

  it('resolves beforeApplicationShutdown only after the drain delay elapses', async () => {
    const gate = new ReadinessGate(20);
    const start = Date.now();

    await gate.beforeApplicationShutdown();

    expect(Date.now() - start).toBeGreaterThanOrEqual(19);
  });

  it('defaults the drain delay when none is injected', () => {
    const gate = new ReadinessGate();
    expect(gate.isReady()).toBe(true);
  });
});
