import type { ValueProvider } from '@nestjs/common';
import { defineResource } from '@smallmodelstudio/contract';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { getRepositoryToken } from './repository.token';
import { ResourceModule } from './resource.module';
import type { ResourceRepository } from './resource-repository';

const Widget = z.object({ id: z.number().int().positive(), name: z.string() });

const widgets = defineResource({
  path: '/widgets',
  entity: Widget,
  create: Widget.omit({ id: true }),
  operations: ['list', 'get'],
});

describe('ResourceModule.forFeature', () => {
  it('provides the given adapter under getRepositoryToken(contract)', () => {
    const adapter = {} as ResourceRepository<typeof widgets>;

    const dynamicModule = ResourceModule.forFeature(widgets, { adapter });

    const token = getRepositoryToken(widgets);
    expect(dynamicModule.exports).toEqual([token]);
    const provider = dynamicModule.providers?.[0] as ValueProvider;
    expect(provider.provide).toBe(token);
    expect(provider.useValue).toBe(adapter);
  });

  it('resolves the same token for the same contract path across calls', () => {
    const first = ResourceModule.forFeature(widgets, { adapter: {} as ResourceRepository<typeof widgets> });
    const second = ResourceModule.forFeature(widgets, { adapter: {} as ResourceRepository<typeof widgets> });

    expect(first.exports?.[0]).toBe(second.exports?.[0]);
  });
});
