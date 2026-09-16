# @smallmodelstudio/nest-config

Env vars parsed and shaped by one Zod schema:

```ts
import { z } from 'zod';
import { ConfigKitModule } from '@smallmodelstudio/nest-config';

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  })
  .transform((env) => ({ env: env.NODE_ENV, port: env.PORT }));

export type AppConfig = z.infer<typeof schema>;

@Module({ imports: [ConfigKitModule.forRoot({ schema })] })
export class AppModule {}
```

`process.env` is parsed once, at `forRoot()`, and the result — including
whatever nested shape the schema's own `.transform()` builds — is provided
for injection:

```ts
constructor(@InjectConfig() private readonly config: AppConfig) {}
```

An invalid environment throws immediately, listing every failing field.
