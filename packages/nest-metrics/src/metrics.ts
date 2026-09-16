import {
  metrics,
  type Counter,
  type Histogram,
  type MetricOptions,
} from '@opentelemetry/api';

export interface CounterMetric<
  Attrs extends Record<string, string> = Record<string, never>,
> {
  add(value: number, attributes?: Attrs): void;
}

export interface HistogramMetric<
  Attrs extends Record<string, string> = Record<string, never>,
> {
  record(value: number, attributes?: Attrs): void;
}

export interface DefineMetricOptions extends MetricOptions {
  /** Defaults to '@smallmodelstudio/nest-metrics'. */
  meterName?: string;
}

// `metrics.getMeter()` returns a real Meter once an OTel SDK has registered
// a MeterProvider, and a no-op Meter otherwise (unit/e2e tests, or no SDK at
// all) — so every metric defined here is always safe to use.

export function defineCounter<
  Attrs extends Record<string, string> = Record<string, never>,
>(name: string, options: DefineMetricOptions = {}): CounterMetric<Attrs> {
  const { meterName, ...metricOptions } = options;
  const counter: Counter = metrics
    .getMeter(meterName ?? '@smallmodelstudio/nest-metrics')
    .createCounter(name, metricOptions);
  return { add: (value, attributes) => counter.add(value, attributes) };
}

export function defineHistogram<
  Attrs extends Record<string, string> = Record<string, never>,
>(name: string, options: DefineMetricOptions = {}): HistogramMetric<Attrs> {
  const { meterName, ...metricOptions } = options;
  const histogram: Histogram = metrics
    .getMeter(meterName ?? '@smallmodelstudio/nest-metrics')
    .createHistogram(name, metricOptions);
  return { record: (value, attributes) => histogram.record(value, attributes) };
}
