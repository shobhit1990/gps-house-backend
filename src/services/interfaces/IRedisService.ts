import Redis from 'ioredis';

export interface IRedisService {
  increment(key: string): Promise<number>;
  setExpiry(key: string, seconds: number): Promise<void>;
  store(key: string, data: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
  invalidate(pattern: string): Promise<void>;
  quit(): Promise<void>;
  flushAll(): Promise<void>;
  flushDB(): Promise<void>;
  getClient(): Redis;
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
}
