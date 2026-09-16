// Loaded via `node --import @smallmodelstudio/otel/register`, before Nest —
// or anything else — is required. Loading it later (e.g. from main.ts) is
// too late: OTel's auto-instrumentation works by patching a module the first
// time it's require()'d, and by then Axios/Node's http module and friends
// are already required.
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { registerShutdownHandler } from './register-shutdown-handler';

// A library can't assume where a consuming app's package.json lives, unlike
// the harness (which read its own, resolved relative to this file) — so
// service identity comes from env vars only, the same ones OTel's own SDK
// already reads for everything else (OTEL_EXPORTER_OTLP_ENDPOINT etc.).
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] ?? 'unknown-service',
    [ATTR_SERVICE_VERSION]: process.env['OTEL_SERVICE_VERSION'] ?? '0.0.0',
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Every dotenv/config read becomes a span otherwise, for no insight
      // into where an app's time actually goes.
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Log *correlation* (trace_id/span_id injected into pino lines) stays
      // on; log *sending* (mirroring pino output to the OTel Logs API) is
      // off — logs stay on stdout, with no OTLP logs pipeline.
      '@opentelemetry/instrumentation-pino': { disableLogSending: true },
    }),
  ],
});

sdk.start();

// Drains the last batch of spans/metrics on shutdown, so a request handled
// right before SIGTERM isn't lost. registerShutdownHandler (not a bare
// `void sdk.shutdown()`) matters here: sdk.shutdown() rejects when the
// collector it's flushing to is unreachable, and an unhandled rejection at
// that point crashes the process with a non-zero exit code on every
// SIGTERM in an environment with no collector.
registerShutdownHandler(() => sdk.shutdown());
