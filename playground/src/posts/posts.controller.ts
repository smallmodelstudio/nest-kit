import {
  ContractBody,
  ContractParam,
  ContractQuery,
  Operation,
  ResourceController,
} from '@smallmodelstudio/nest-zod';
import type { CreatePost, Post, PostsQuery } from './post.contract';
import { posts } from './post.contract';
import { PostsService } from './posts.service';

@ResourceController(posts)
export class PostsController {
  constructor(private readonly service: PostsService) {}

  @Operation(posts, 'list')
  findAll(@ContractQuery(posts) query: PostsQuery) {
    return this.service.findAll(query);
  }

  @Operation(posts, 'get')
  findOne(@ContractParam(posts, 'id') id: number): Post {
    return this.service.findOne(id);
  }

  @Operation(posts, 'create')
  create(@ContractBody(posts, 'create') body: CreatePost): Post {
    return this.service.create(body);
  }

  @Operation(posts, 'replace')
  replace(
    @ContractParam(posts, 'id') id: number,
    @ContractBody(posts, 'replace') body: CreatePost,
  ): Post {
    return this.service.replace(id, body);
  }

  @Operation(posts, 'patch')
  patch(
    @ContractParam(posts, 'id') id: number,
    @ContractBody(posts, 'patch') body: Partial<CreatePost>,
  ): Post {
    return this.service.patch(id, body);
  }

  @Operation(posts, 'remove')
  remove(@ContractParam(posts, 'id') id: number): null {
    return this.service.remove(id);
  }
}
