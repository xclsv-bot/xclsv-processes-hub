import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService): Redis | null => {
    const logger = new Logger('RedisProvider');
    const redisUrl = configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      logger.warn('REDIS_URL not configured, caching disabled');
      return null;
    }

    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => {
      logger.log('Connected to Redis');
    });

    redis.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    return redis;
  },
  inject: [ConfigService],
};
