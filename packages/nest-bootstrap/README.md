# @smallmodelstudio/nest-bootstrap

```ts
import { createApp } from '@smallmodelstudio/nest-bootstrap';
import { registerCorrelationIdHook } from '@smallmodelstudio/nest-context';

const app = await createApp(AppModule, {
  plugins: [
    {
      configure: (app) =>
        registerCorrelationIdHook(app.getHttpAdapter().getInstance()),
    },
  ],
});

// App-specific setup that isn't shared with a test app: Swagger, listen().
await app.listen({ port: 3000, host: '0.0.0.0' });
```

Builds the app on the shared Fastify adapter (`trustProxy` from the
`TRUST_PROXY` env var), runs each plugin's `configure()` in order, and calls
`enableShutdownHooks()`. Correlation, logging and Swagger come in as plugins
from their own packages — `nest-bootstrap` doesn't depend on any of them.

`@smallmodelstudio/nest-testing`'s `createTestApp` takes the same
`{ plugins }` shape, so a test app can't quietly drift from what `main.ts`
actually boots.
