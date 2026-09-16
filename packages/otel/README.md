# @smallmodelstudio/otel

OpenTelemetry SDK setup for a Node service, loaded before anything else so
its auto-instrumentation can patch modules on first `require()`:

```
node --import @smallmodelstudio/otel/register dist/main.js
```

Service identity comes from `OTEL_SERVICE_NAME` / `OTEL_SERVICE_VERSION` (both
optional); everything else — the collector endpoint, sampling, etc. — comes
from the standard `OTEL_*` env vars the SDK already reads.

`registerShutdownHandler` is exported separately for draining the last batch
of spans/metrics on `SIGTERM`/`SIGINT` without an unreachable collector
crashing the process:

```ts
import { registerShutdownHandler } from '@smallmodelstudio/otel';

registerShutdownHandler(() => sdk.shutdown());
```

This package never imports Nest — it has to load before Nest does.
