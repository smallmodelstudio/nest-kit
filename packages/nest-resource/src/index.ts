export {
  type AnyResourceContract,
  type ResourceListResult,
  type ResourceRepository,
} from './resource-repository';
export { getRepositoryToken, InjectRepository } from './repository.token';
export { ResourceModule, type ResourceModuleOptions } from './resource.module';
export { inMemoryAdapter, type InMemoryAdapterOptions } from './adapters/in-memory.adapter';
export { httpProxyAdapter } from './adapters/http-proxy.adapter';
