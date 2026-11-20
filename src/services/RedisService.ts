import { Redis, RedisOptions } from 'ioredis';
import { injectable } from 'tsyringe';
import { AppError } from '../utils/errors';
import { logger } from '../configs/logger';
import { IRedisService } from './interfaces/IRedisService';

// Redis key prefixes
const BLACKLISTED_TOKEN_PREFIX = 'blacklisted_token:';

@injectable()
export class RedisService implements IRedisService {
  private static instance: Redis;
  private client: Redis;

  constructor() {
    if (!RedisService.instance) {
      const redisOptions: RedisOptions = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        connectTimeout: 10000, // 10 seconds
        keepAlive: 10000, // 10 seconds
        lazyConnect: true,
        // Required by BullMQ for blocking commands (BRPOP); must be null.
        maxRetriesPerRequest: null,
      };

      const redisUser = process.env.REDIS_USER || '';
      const redisPassword = process.env.REDIS_PASSWORD || '';

      if (redisUser && redisPassword) {
        redisOptions.username = redisUser;
        redisOptions.password = redisPassword;
      }

      RedisService.instance = new Redis(redisOptions);

      RedisService.instance.on('error', (err) => {
        console.error('Redis Client Error', err);
      });

      RedisService.instance
        .connect()
        .then(() => {
          console.log('Redis client connected successfully');
        })
        .catch((error) => {
          console.error('Redis client failed to connect:', error);
        });
    }

    this.client = RedisService.instance;
  }

  // ✅ Expose Redis client so Bull can use it
  getClient(): Redis {
    return this.client;
  }

  async increment(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async setExpiry(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async store(key: string, data: string, ttl: number): Promise<void> {
    try {
      await this.client.setex(key, ttl, data);
    } catch (error) {
      logger.error('Error storing value in Redis', error);
      throw new AppError('Error storing value in Redis', 500, error);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Error getting value from Redis', error);
      throw new AppError('Error getting value from Redis', 500, error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      if (!pattern.includes('*')) {
        // Exact key delete
        await this.client.del(pattern);
        return;
      }

      // Wildcard pattern delete
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];

      for await (const batch of stream) {
        keys.push(...batch);
      }

      if (keys.length) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error(`Error invalidating Redis keys for pattern "${pattern}"`, error);
      throw new AppError('Error deleting values from Redis', 500, error);
    }
  }

  /*
   * Flushes all Redis databases.
   */
  async flushAll() {
    try {
      await this.client.flushall();
      logger.info('✅ Redis cache flushed (FLUSHALL)');
    } catch (error) {
      logger.error('❌ Error flushing Redis:', error);
    }
  }

  /*
   * Flushes only the current Redis database.
   */
  async flushDB() {
    try {
      await this.client.flushdb();
      console.log('✅ Redis database flushed (FLUSHDB)');
    } catch (error) {
      console.error('❌ Error flushing Redis DB:', error);
    }
  }

  async quit() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error('Error setting value in Redis with NX', error);
      throw new AppError('Error setting value in Redis', 500, error);
    }
  }
}

export default RedisService;
