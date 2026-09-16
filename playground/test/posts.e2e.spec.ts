import 'reflect-metadata';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { mergeOpenApiComponents } from '@smallmodelstudio/contract';
import { TransformInterceptor } from '@smallmodelstudio/nest-envelope';
import { GlobalExceptionFilter } from '@smallmodelstudio/nest-errors';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import type { Post } from '../src/posts/post.contract';

interface SuccessBody<T> {
  data: T;
  meta: {
    timestamp: string;
    correlationId: string;
    page?: { offset: number; limit: number; total: number };
  };
}

interface ErrorBody {
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
  correlationId: string;
}

describe('posts (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /posts returns the paginated success envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts' });
    expect(response.statusCode).toBe(200);
    const body = response.json<SuccessBody<Post[]>>();
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
    const body = response.json<SuccessBody<Post[]>>();
    expect(body.data.every((post) => post.userId === 1)).toBe(true);
  });

  it('GET /posts/:id returns the success envelope for one post', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/1' });
    expect(response.statusCode).toBe(200);
    const body = response.json<SuccessBody<Post>>();
    expect(body.data).toMatchObject({ id: 1, title: 'First post' });
  });

  it('GET /posts/0x1 rejects a hex id with a 400 error envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/0x1' });
    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorBody>();
    expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect(typeof body.correlationId).toBe('string');
  });

  it('GET /posts/999 returns a 404 error envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/999' });
    expect(response.statusCode).toBe(404);
    expect(response.json<ErrorBody>()).toMatchObject({
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
    expect(created.json<SuccessBody<Post>>().data).toMatchObject({
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
    expect(response.json<SuccessBody<Post>>().data).toMatchObject({
      id: 2,
      title: 'Updated title',
    });
  });

  it('DELETE /posts/:id removes a post', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/posts/3' });
    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessBody<null>>().data).toBeNull();

    const after = await app.inject({ method: 'GET', url: '/posts/3' });
    expect(after.statusCode).toBe(404);
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
