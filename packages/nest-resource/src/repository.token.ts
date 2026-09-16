import { Inject } from '@nestjs/common';
import type { AnyResourceContract } from './resource-repository';

// Keyed by `contract.path` rather than the contract object's identity, so
// `ResourceModule.forFeature(contract, ...)` and `@InjectRepository(contract)`
// agree on the same token even when each imports its own copy of the
// contract module (e.g. across a build boundary).
const tokens = new Map<string, symbol>();

export function getRepositoryToken(contract: AnyResourceContract): symbol {
  const existing = tokens.get(contract.path);
  if (existing) {
    return existing;
  }
  const token = Symbol(`RESOURCE_REPOSITORY(${contract.path})`);
  tokens.set(contract.path, token);
  return token;
}

/** Injects the repository `ResourceModule.forFeature(contract, ...)` provided. */
export function InjectRepository(contract: AnyResourceContract): ParameterDecorator {
  return Inject(getRepositoryToken(contract));
}
