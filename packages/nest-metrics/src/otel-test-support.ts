import { metrics } from '@opentelemetry/api';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
  type ScopeMetrics,
} from '@opentelemetry/sdk-metrics';

/** Registers a real, in-memory MeterProvider for a spec's duration. Call `cleanup()` in `afterEach`. */
export function setUpTestMeterProvider(): {
  reader: PeriodicExportingMetricReader;
  cleanup: () => Promise<void>;
} {
  const exporter = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE,
  );
  // Long enough that the periodic export timer never actually fires during a
  // test; `reader.collect()` is called directly instead.
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 3_600_000,
  });
  const provider = new MeterProvider({ readers: [reader] });
  metrics.setGlobalMeterProvider(provider);

  return {
    reader,
    cleanup: async () => {
      metrics.disable();
      await provider.shutdown();
    },
  };
}

/** The recorded data points for the named metric — a Counter's `.value` is its running sum; a Histogram's is its `HistogramData` (`.sum`, `.count`, ...). */
export async function dataPointsFor(
  reader: PeriodicExportingMetricReader,
  name: string,
): Promise<Array<{ attributes: Record<string, unknown>; value: unknown }>> {
  const { resourceMetrics } = await reader.collect();
  const scopeMetrics: ScopeMetrics[] = resourceMetrics.scopeMetrics;
  const metric = scopeMetrics
    .flatMap((scope) => scope.metrics)
    .find((candidate) => candidate.descriptor.name === name);
  return metric?.dataPoints ?? [];
}
