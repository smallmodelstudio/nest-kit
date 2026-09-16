import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { defineCounter, defineHistogram } from './metrics';
import { dataPointsFor, setUpTestMeterProvider } from './otel-test-support';

describe('defineCounter / defineHistogram', () => {
  let reader: PeriodicExportingMetricReader;
  let cleanup: () => Promise<void>;

  beforeEach(() => {
    ({ reader, cleanup } = setUpTestMeterProvider());
  });

  afterEach(() => cleanup());

  it('records a counter labeled by its attributes', async () => {
    const counter = defineCounter<{ result: string }>('test_counter_total');

    counter.add(1, { result: 'hit' });
    counter.add(1, { result: 'miss' });
    counter.add(1, { result: 'hit' });

    const points = await dataPointsFor(reader, 'test_counter_total');
    const hit = points.find((point) => point.attributes['result'] === 'hit');
    const miss = points.find((point) => point.attributes['result'] === 'miss');

    expect(hit?.value).toBe(2);
    expect(miss?.value).toBe(1);
  });

  it('records a histogram', async () => {
    const histogram = defineHistogram<{ route: string }>('test_histogram_ms');

    histogram.record(12, { route: '/posts' });
    histogram.record(8, { route: '/posts' });

    const [point] = await dataPointsFor(reader, 'test_histogram_ms');
    const value = point?.value as { count: number; sum: number } | undefined;

    expect(value?.count).toBe(2);
    expect(value?.sum).toBe(20);
  });

  it('is a no-op without a registered MeterProvider', async () => {
    await cleanup();

    const counter = defineCounter('another_test_counter_total');
    expect(() => counter.add(1)).not.toThrow();
  });
});
