import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private healthy = false;

  constructor(private readonly cfg: ConfigService) {}

  onModuleInit() {
    const url = this.cfg.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set, cache disabled');
      return;
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: false,
      });
      this.client.on('error', (err) => {
        if (this.healthy) this.logger.error(`Redis error: ${err.message}`);
        this.healthy = false;
      });
      this.client.on('ready', () => {
        this.logger.log('Redis connected');
        this.healthy = true;
      });
    } catch (err) {
      this.logger.error(`Redis init failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.healthy || !this.client) return null;
    try {
      const v = await this.client.get(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    if (!this.healthy || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
      // best-effort
    }
  }

  /**
   * Cache-aside: get → set on miss
   * Always executes loader; on Redis failure, returns loader result directly.
   */
  async wrap<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`HIT  ${key}`);
      return cached;
    }
    this.logger.debug(`MISS ${key}`);
    const fresh = await loader();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}
