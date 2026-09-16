import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { getRepositoryToken } from './repository.token';
import type { AnyResourceContract, ResourceRepository } from './resource-repository';

export interface ResourceModuleOptions<R extends AnyResourceContract> {
  adapter: ResourceRepository<R>;
}

/**
 * `ResourceModule.forFeature(contract, { adapter })` provides the given
 * adapter under the token `@InjectRepository(contract)` resolves. The
 * adapter is a plain `ResourceRepository` value — `inMemoryAdapter(...)`,
 * `httpProxyAdapter(...)`, or `nest-drizzle`'s `drizzleAdapter(...)`, called
 * directly rather than wired through Nest's own DI, so a provider that needs
 * a dependency (e.g. `httpProxyAdapter` needs a `NestHttpService`) resolves
 * it itself with an ordinary Nest provider and passes the result in here.
 */
@Module({})
export class ResourceModule {
  static forFeature<R extends AnyResourceContract>(
    contract: R,
    options: ResourceModuleOptions<R>,
  ): DynamicModule {
    const token = getRepositoryToken(contract);
    return {
      module: ResourceModule,
      providers: [{ provide: token, useValue: options.adapter }],
      exports: [token],
    };
  }
}
