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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),

    // Global modules
    CacheModule,
    AuthorizationModule,

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    ProcessesModule,
    VersionsModule,
    SearchModule,
    AIModule,
  ],
})
export class AppModule {}
