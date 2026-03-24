import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RedisProvider } from './redis.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisProvider, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
