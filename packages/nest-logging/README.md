# @smallmodelstudio/nest-logging

`nestjs-pino` setup with sensible defaults:

```ts
import { NestKitLoggerModule } from '@smallmodelstudio/nest-logging';
import { RequestContext } from '@smallmodelstudio/nest-context';

@Module({
  imports: [
    NestKitLoggerModule.forRoot({
      getCorrelationId: () => RequestContext.correlationId(),
    }),
  ],
})
export class AppModule {}
```

Then, in `main.ts` (so Nest's own bootstrap-time logging is included):

```ts
app.useLogger(app.get(Logger)); // Logger from 'nestjs-pino'
```

- Level: `silent` when `NODE_ENV=test`, `info` in production, `debug`
  otherwise — override with `forRoot({ level })`.
- `pino-pretty` output when it's actually installed (an optional peer
  dependency); structured JSON otherwise, regardless of `NODE_ENV`.
- The access-log line's level follows the response: `error` on a 5xx (or a
  thrown error), `warn` on a 4xx, `info` otherwise.
- `getCorrelationId` (optional) is logged as `correlationId` on every line —
  wire in `RequestContext.correlationId` from `@smallmodelstudio/nest-context`
  if you're using it, since `nest-logging` doesn't depend on it directly.
