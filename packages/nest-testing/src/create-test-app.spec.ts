import { Controller, Get, Module } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import { api } from './api';
import { mockUpstream } from './mock-upstream';
import { nockLifecycle } from './nock-lifecycle';

const lifecycle = nockLifecycle();
beforeAll(lifecycle.setUp);
afterEach(lifecycle.tearDownEach);
afterAll(lifecycle.tearDownAll);

@Controller()
class PingController {
  @Get('/ping')
  ping(): { pong: true } {
    return { pong: true };
  }
}

@Module({ controllers: [PingController] })
class PingModule {}

describe('createTestApp / api / mockUpstream', () => {
  it('boots the given module and serves real requests through supertest', async () => {
    const app = await createTestApp(PingModule);
    try {
      const response = await api(app).get('/ping');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ pong: true });
    } finally {
      await app.close();
    }
  });

  it('runs every plugin before the app starts serving requests', async () => {
    const order: string[] = [];
    const app = await createTestApp(PingModule, {
      plugins: [{ configure: () => void order.push('configured') }],
    });
    try {
      await api(app).get('/ping');
      expect(order).toEqual(['configured']);
    } finally {
      await app.close();
    }
  });

  it('mocks an upstream call via nock', async () => {
    const scope = mockUpstream('https://example.com')
      .get('/posts/1')
      .reply(200, { id: 1 });

    const response = await fetch('https://example.com/posts/1');

    expect(await response.json()).toEqual({ id: 1 });
    expect(scope.isDone()).toBe(true);
  });
});
