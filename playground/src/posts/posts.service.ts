import { Injectable } from '@nestjs/common';
import {
  InjectRepository,
  type ResourceListResult,
  type ResourceRepository,
} from '@smallmodelstudio/nest-resource';
import { posts, type CreatePost, type Post, type PostsQuery } from './post.contract';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(posts) private readonly repository: ResourceRepository<typeof posts>,
  ) {}

  findAll(query: PostsQuery): Promise<ResourceListResult<typeof posts>> {
    return this.repository.list(query);
  }

  findOne(id: number): Promise<Post> {
    return this.repository.get(id);
  }

  create(body: CreatePost): Promise<Post> {
    return this.repository.create(body);
  }

  replace(id: number, body: CreatePost): Promise<Post> {
    return this.repository.replace(id, body);
  }

  patch(id: number, body: Partial<CreatePost>): Promise<Post> {
    return this.repository.patch(id, body);
  }

  remove(id: number): Promise<null> {
    return this.repository.remove(id);
  }
}
