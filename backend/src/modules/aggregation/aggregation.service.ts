import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TicRecord } from '../metrics/entities/tic-record.entity';
import { TicAggregateDaily } from '../metrics/entities/tic-aggregate-daily.entity';
import { MetaRefreshLog } from '../metrics/entities/meta-refresh-log.entity';
import { CacheService } from '../../common/cache/cache.service';

/**
 * Fallback aggregation — runs daily at 03:00 UTC.
 * Aggregates tic_records → tic_aggregates_daily (UPSERT).
 * Acts as a safety net if the data collection agent doesn't pre-aggregate.
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    @InjectRepository(TicRecord) private readonly recRepo: Repository<TicRecord>,
    @InjectRepository(TicAggregateDaily) private readonly aggRepo: Repository<TicAggregateDaily>,
    @InjectRepository(MetaRefreshLog) private readonly logRepo: Repository<MetaRefreshLog>,
    private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyAggregation() {
    await this.aggregateForDate(new Date());
  }

  async aggregateForDate(target: Date): Promise<void> {
    const startedAt = new Date();
    const dateStr = target.toISOString().slice(0, 10);
    const log = this.logRepo.create({ source: 'fallback-cron', status: 'running', startedAt });
    await this.logRepo.save(log);

    try {
      // Aggregate from raw records
      const rows = await this.recRepo
        .createQueryBuilder('r')
        .select('r.recordDate', 'agg_date')
        .addSelect('r.category', 'category')
        .addSelect('r.region', 'region')
        .addSelect('COUNT(*)', 'total_count')
        .addSelect("SUM(CASE WHEN r.status = 'passed' THEN 1 ELSE 0 END)", 'passed_count')
        .addSelect("SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END)", 'failed_count')
        .addSelect("SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END)", 'pending_count')
        .addSelect("SUM(CASE WHEN r.status = 'in_progress' THEN 1 ELSE 0 END)", 'in_progress_count')
        .addSelect('AVG(r.turnaround_days)', 'avg_turnaround')
        .addSelect('SUM(r.amount)', 'total_amount')
        .where('r.recordDate = :date', { date: dateStr })
        .groupBy('r.recordDate, r.category, r.region')
        .getRawMany();

      // UPSERT
      await this.dataSource.transaction(async (em) => {
        for (const r of rows) {
          await em.query(
            `INSERT INTO tic_aggregates_daily
              (agg_date, category, region, total_count, passed_count, failed_count,
               pending_count, in_progress_count, avg_turnaround, total_amount, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
             ON CONFLICT (agg_date, category, region) DO UPDATE SET
               total_count = EXCLUDED.total_count,
               passed_count = EXCLUDED.passed_count,
               failed_count = EXCLUDED.failed_count,
               pending_count = EXCLUDED.pending_count,
               in_progress_count = EXCLUDED.in_progress_count,
               avg_turnaround = EXCLUDED.avg_turnaround,
               total_amount = EXCLUDED.total_amount,
               updated_at = NOW()`,
            [
              r.agg_date,
              r.category,
              r.region,
              parseInt(r.total_count, 10),
              parseInt(r.passed_count || '0', 10),
              parseInt(r.failed_count || '0', 10),
              parseInt(r.pending_count || '0', 10),
              parseInt(r.in_progress_count || '0', 10),
              r.avg_turnaround ? parseFloat(r.avg_turnaround) : null,
              r.total_amount ? parseFloat(r.total_amount) : null,
            ],
          );
        }
      });

      // Bust cache
      await this.bustCache();

      log.status = 'success';
      log.recordCount = rows.length;
      log.finishedAt = new Date();
      await this.logRepo.save(log);
      this.logger.log(`Aggregated ${rows.length} rows for ${dateStr}`);
    } catch (err) {
      log.status = 'failed';
      log.errorMessage = err.message;
      log.finishedAt = new Date();
      await this.logRepo.save(log);
      this.logger.error(`Aggregation failed: ${err.message}`);
    }
  }

  private async bustCache() {
    // Simple pattern delete
    try {
      // ioredis supports SCAN; for MVP we just leave TTL to expire (5min max)
      this.logger.debug('Cache will expire naturally in ≤5min');
    } catch {
      // noop
    }
  }
}
