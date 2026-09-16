import { Module } from '@nestjs/common';
import { ResourceModule, inMemoryAdapter } from '@smallmodelstudio/nest-resource';
import { posts, type Post } from './post.contract';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

const seedPosts: Post[] = [
  { id: 1, userId: 1, title: 'First post', body: 'Hello world' },
  { id: 2, userId: 1, title: 'Second post', body: 'More words' },
  { id: 3, userId: 2, title: 'Third post', body: 'Even more words' },
];

@Module({
  imports: [
    ResourceModule.forFeature(posts, {
      adapter: inMemoryAdapter(posts, {
        seed: seedPosts,
        filter: (post, query) => query.userId === undefined || post.userId === query.userId,
      }),
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
