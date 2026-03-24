import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes
  private readonly memoryCache = new Map<string, { value: any; expires: number }>();

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    if (!redis) {
      this.logger.warn('Redis not available, using in-memory cache');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix);

    if (this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        this.logger.error(`Cache get error: ${error.message}`);
        return null;
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(fullKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    this.memoryCache.delete(fullKey);
    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix);
    const ttl = options?.ttl || this.defaultTTL;

    if (this.redis) {
      try {
        await this.redis.setex(fullKey, ttl, JSON.stringify(value));
        return;
      } catch (error) {
        this.logger.error(`Cache set error: ${error.message}`);
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(fullKey, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix);

    if (this.redis) {
      try {
        await this.redis.del(fullKey);
        return;
      } catch (error) {
        this.logger.error(`Cache delete error: ${error.message}`);
      }
    }

    this.memoryCache.delete(fullKey);
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      } catch (error) {
        this.logger.error(`Cache deletePattern error: ${error.message}`);
      }
    }

    // Fallback: clear matching keys from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get or set cache value with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Store idempotency key result
   */
  async setIdempotencyKey(key: string, result: any): Promise<void> {
    await this.set(key, result, {
      prefix: 'idempotency',
      ttl: 86400, // 24 hours
    });
  }

  /**
   * Get idempotency key result
   */
  async getIdempotencyKey(key: string): Promise<any | null> {
    return this.get(key, { prefix: 'idempotency' });
  }

  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`;
    }
    return `process-hub:${key}`;
  }
}
