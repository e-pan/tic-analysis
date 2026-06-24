import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../../common/cache/cache.service';

@Controller('api/health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async health() {
    const dbOk = await this.checkDb();
    const redisOk = this.cache.isHealthy();

    const status = dbOk && redisOk ? 'ok' : dbOk ? 'degraded' : 'down';

    return {
      status,
      db: dbOk ? 'ok' : 'down',
      redis: redisOk ? 'ok' : 'down',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.ds.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
