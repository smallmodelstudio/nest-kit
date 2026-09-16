import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResult } from '@smallmodelstudio/contract';
import type { CreatePost, Post, PostsQuery } from './post.contract';

@Injectable()
export class PostsService {
  private posts: Post[] = [
    { id: 1, userId: 1, title: 'First post', body: 'Hello world' },
    { id: 2, userId: 1, title: 'Second post', body: 'More words' },
    { id: 3, userId: 2, title: 'Third post', body: 'Even more words' },
  ];
  private nextId = 4;

  findAll(query: PostsQuery): PaginatedResult<Post> {
    const filtered =
      query.userId === undefined
        ? this.posts
        : this.posts.filter((post) => post.userId === query.userId);
    const items = filtered.slice(query.offset, query.offset + query.limit);
    return {
      items,
      page: {
        offset: query.offset,
        limit: query.limit,
        total: filtered.length,
      },
    };
  }

  findOne(id: number): Post {
    return this.getOrThrow(id);
  }

  create(body: CreatePost): Post {
    const post: Post = { id: this.nextId++, ...body };
    this.posts.push(post);
    return post;
  }

  replace(id: number, body: CreatePost): Post {
    const existing = this.getOrThrow(id);
    const replaced: Post = { ...body, id: existing.id };
    this.posts = this.posts.map((post) => (post.id === id ? replaced : post));
    return replaced;
  }

  patch(id: number, body: Partial<CreatePost>): Post {
    const existing = this.getOrThrow(id);
    const patched: Post = { ...existing, ...body };
    this.posts = this.posts.map((post) => (post.id === id ? patched : post));
    return patched;
  }

  remove(id: number): null {
    this.getOrThrow(id);
    this.posts = this.posts.filter((post) => post.id !== id);
    return null;
  }

  private getOrThrow(id: number): Post {
    const post = this.posts.find((candidate) => candidate.id === id);
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return post;
  }
}
