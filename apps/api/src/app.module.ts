import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from './modules/cache/cache.module';
import { AuthorizationModule } from './modules/authorization';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { VersionsModule } from './modules/versions/versions.module';
import { SearchModule } from './modules/search/search.module';
import { AIModule } from './modules/ai/ai.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    CacheModule,
    AuthorizationModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProcessesModule,
    VersionsModule,
    SearchModule,
    AIModule,
    MediaModule,
  ],
})
export class AppModule {}
