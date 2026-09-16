import { afterEach, describe, expect, it } from 'vitest';
import { Module } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp, createFastifyAdapter } from './create-app';
import type { BootstrapPlugin } from './bootstrap-plugin';

@Module({})
class EmptyModule {}

describe('createApp', () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env['TRUST_PROXY'];
  });

  it('runs every plugin, in order, before returning', async () => {
    const order: string[] = [];
    const plugins: BootstrapPlugin[] = [
      { configure: () => void order.push('first') },
      { configure: () => Promise.resolve(void order.push('second')) },
    ];

    app = await createApp(EmptyModule, { plugins });

    expect(order).toEqual(['first', 'second']);
  });

  it('boots with no plugins at all', async () => {
    app = await createApp(EmptyModule);
    expect(app).toBeDefined();
  });
});

describe('createFastifyAdapter', () => {
  afterEach(() => {
    delete process.env['TRUST_PROXY'];
  });

  // trustProxy isn't reflected on any typed property of the Fastify
  // instance — its effect is only observable through request.ip, so that's
  // what these assert against, via Fastify's inject() (no real socket).
  const requestIp = async (trustProxy: boolean): Promise<string> => {
    if (trustProxy) {
      process.env['TRUST_PROXY'] = 'true';
    } else {
      delete process.env['TRUST_PROXY'];
    }
    const instance = createFastifyAdapter().getInstance();
    instance.get('/ip', (request, reply) => reply.send({ ip: request.ip }));
    await instance.ready();
    const response = await instance.inject({
      method: 'GET',
      url: '/ip',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    await instance.close();
    return response.json<{ ip: string }>().ip;
  };

  it('does not trust the proxy by default', async () => {
    expect(await requestIp(false)).not.toBe('1.2.3.4');
  });

  it('trusts X-Forwarded-For when TRUST_PROXY=true', async () => {
    expect(await requestIp(true)).toBe('1.2.3.4');
  });
});
