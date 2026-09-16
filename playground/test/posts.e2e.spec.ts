import 'reflect-metadata';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mergeOpenApiComponents } from '@smallmodelstudio/contract';
import { registerCorrelationIdHook } from '@smallmodelstudio/nest-context';
import {
  createTestApp,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from '@smallmodelstudio/nest-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import type { Post } from '../src/posts/post.contract';

describe('posts (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp(AppModule, {
      plugins: [
        {
          configure: (app: NestFastifyApplication) =>
            registerCorrelationIdHook(app.getHttpAdapter().getInstance()),
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /posts returns the paginated success envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts' });
    expect(response.statusCode).toBe(200);
    const body = response.json<SuccessEnvelope<Post[]>>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.page).toEqual({ offset: 0, limit: 20, total: 3 });
    expect(typeof body.meta.correlationId).toBe('string');
  });

  it('GET /posts?userId=1 filters by userId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/posts?userId=1',
    });
    const body = response.json<SuccessEnvelope<Post[]>>();
    expect(body.data.every((post) => post.userId === 1)).toBe(true);
  });

  it('GET /posts/1 twice hits the cache the second time', async () => {
    const first = await app.inject({ method: 'GET', url: '/posts/1' });
    const second = await app.inject({ method: 'GET', url: '/posts/1' });
    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
  });

  it('GET /posts/:id returns the success envelope for one post', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/1' });
    expect(response.statusCode).toBe(200);
    const body = response.json<SuccessEnvelope<Post>>();
    expect(body.data).toMatchObject({ id: 1, title: 'First post' });
  });

  it('GET /posts/0x1 rejects a hex id with a 400 error envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/0x1' });
    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorEnvelope>();
    expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect(typeof body.correlationId).toBe('string');
  });

  it('GET /posts/999 returns a 404 error envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/999' });
    expect(response.statusCode).toBe(404);
    expect(response.json<ErrorEnvelope>()).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/posts/999',
    });
  });

  it('POST /posts creates a post and rejects an invalid body', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/posts',
      payload: { userId: 1, title: 'New post', body: 'Some body' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json<SuccessEnvelope<Post>>().data).toMatchObject({
      title: 'New post',
    });

    const invalid = await app.inject({
      method: 'POST',
      url: '/posts',
      payload: { userId: 1, title: '' },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it('PATCH /posts/:id partially updates a post', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/posts/2',
      payload: { title: 'Updated title' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessEnvelope<Post>>().data).toMatchObject({
      id: 2,
      title: 'Updated title',
    });
  });

  it('DELETE /posts/:id removes a post', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/posts/3' });
    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessEnvelope<null>>().data).toBeNull();
  });

  it('GET /health/live and /health/ready both succeed', async () => {
    const live = await app.inject({ method: 'GET', url: '/health/live' });
    expect(live.statusCode).toBe(200);

    const ready = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.statusCode).toBe(200);
  });

  it('exposes Post and CreatePost as named $ref schemas in the OpenAPI document', () => {
    const config = new DocumentBuilder()
      .setTitle('test')
      .setVersion('1')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    mergeOpenApiComponents(document);

    expect(document.components?.schemas?.['Post']).toMatchObject({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        title: { type: 'string' },
      },
    });
    expect(document.components?.schemas?.['CreatePost']).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string' } },
    });

    const createOp = document.paths['/posts']?.post;
    expect(createOp?.requestBody).toBeDefined();

    // Regression check: the list response's items must be a real $ref into
    // components.schemas, not inlined under a local definitions/$defs block.
    const listResponseSchema = document.paths['/posts']?.get?.responses['200'];
    const content = (
      listResponseSchema as {
        content?: {
          'application/json'?: {
            schema?: { properties?: { data?: { items?: unknown } } };
          };
        };
      }
    ).content;
    expect(
      content?.['application/json']?.schema?.properties?.data?.items,
    ).toEqual({ $ref: '#/components/schemas/Post' });
  });
});
