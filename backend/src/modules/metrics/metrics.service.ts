import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TicRecord } from './entities/tic-record.entity';
import { TicAggregateDaily } from './entities/tic-aggregate-daily.entity';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(TicAggregateDaily)
    private readonly aggRepo: Repository<TicAggregateDaily>,
    @InjectRepository(TicRecord)
    private readonly recRepo: Repository<TicRecord>,
    private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  // ===================== KPI =====================
  async getKpi(date?: string): Promise<any> {
    const targetDate = this.resolveDate(date);
    const cacheKey = `tic:kpi:${targetDate}`;

    return this.cache.wrap(cacheKey, 300, async () => {
      try {
        const today = await this.aggRepo
          .createQueryBuilder('a')
          .select('SUM(a.total_count)', 'totalCount')
          .addSelect('SUM(a.passed_count)', 'passedCount')
          .addSelect('SUM(a.failed_count)', 'failedCount')
          .addSelect('SUM(a.in_progress_count)', 'inProgressCount')
          .addSelect('AVG(a.avg_turnaround)', 'avgTurnaround')
          .where('a.aggDate = :date', { date: targetDate })
          .getRawOne();

        const yesterday = await this.aggRepo
          .createQueryBuilder('a')
          .select('SUM(a.total_count)', 'totalCount')
          .where('a.aggDate = :date', {
            date: this.addDays(targetDate, -1),
          })
          .getRawOne();

        const totalCount = parseInt(today?.totalcount || '0', 10);
        const yTotal = parseInt(yesterday?.totalcount || '0', 10);
        const passed = parseInt(today?.passedcount || '0', 10);
        const failed = parseInt(today?.failedcount || '0', 10);
        const inProgress = parseInt(today?.inprogresscount || '0', 10);
        const passRate = totalCount > 0 ? +(passed / totalCount).toFixed(4) : 0;
        const yRate = yTotal > 0 ? +(totalCount / yTotal - 1).toFixed(4) : 0;

        return {
          data: {
            totalCount,
            totalCountDelta: +(yRate * 100).toFixed(2),
            passRate,
            passRateDelta: 0, // 简化：MVP 不算同比
            inProgressCount: inProgress,
            inProgressDelta: 0,
            avgTurnaroundDays: parseFloat(today?.avgturnaround || '0'),
            avgTurnaroundBenchmark: 7.2,
            asOf: new Date().toISOString(),
          },
        };
      } catch (err) {
        this.logger.error(`KPI query failed: ${err.message}`);
        throw new ServiceUnavailableException('Metrics temporarily unavailable');
      }
    });
  }

  // ===================== Trend =====================
  async getTrend(range: string = '7d', category: string = 'all'): Promise<any> {
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
    const cacheKey = `tic:trend:${range}:${category}`;

    return this.cache.wrap(cacheKey, 300, async () => {
      const endDate = new Date();
      const startDate = this.addDays(this.toDateStr(endDate), -(days - 1));

      const qb = this.aggRepo
        .createQueryBuilder('a')
        .select('a.aggDate', 'date')
        .addSelect('a.category', 'category')
        .addSelect('SUM(a.total_count)', 'count')
        .where('a.aggDate BETWEEN :start AND :end', { start: startDate, end: this.toDateStr(endDate) })
        .groupBy('a.aggDate, a.category')
        .orderBy('a.aggDate', 'ASC');

      const rows = await qb.getRawMany();

      // Pivot: date -> { testing, inspection, certification }
      const seriesMap = new Map<string, any>();
      for (const r of rows) {
        const d = r.date instanceof Date ? r.toISOString().slice(0, 10) : String(r.date);
        if (!seriesMap.has(d)) {
          seriesMap.set(d, { date: d, testing: 0, inspection: 0, certification: 0 });
        }
        const item = seriesMap.get(d);
        if (category === 'all' || category === r.category) {
          item[r.category] = parseInt(r.count || '0', 10);
        }
      }

      return {
        data: {
          series: Array.from(seriesMap.values()),
          asOf: new Date().toISOString(),
        },
      };
    });
  }

  // ===================== Category =====================
  async getCategory(range: string = '30d'): Promise<any> {
    const days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
    const cacheKey = `tic:category:${range}`;

    return this.cache.wrap(cacheKey, 300, async () => {
      const endDate = this.toDateStr(new Date());
      const startDate = this.addDays(endDate, -(days - 1));

      const rows = await this.aggRepo
        .createQueryBuilder('a')
        .select('a.category', 'category')
        .addSelect('SUM(a.total_count)', 'count')
        .where('a.aggDate BETWEEN :start AND :end', { start: startDate, end: endDate })
        .groupBy('a.category')
        .getRawMany();

      const total = rows.reduce((s, r) => s + parseInt(r.count || '0', 10), 0);
      const items = rows.map((r) => {
        const count = parseInt(r.count || '0', 10);
        return {
          category: r.category,
          count,
          percentage: total > 0 ? +((count / total) * 100).toFixed(2) : 0,
        };
      });

      return {
        data: { items, asOf: new Date().toISOString() },
      };
    });
  }

  // ===================== Region =====================
  async getRegion(range: string = '30d', top: number = 10): Promise<any> {
    const days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
    const cacheKey = `tic:region:${range}:${top}`;

    return this.cache.wrap(cacheKey, 300, async () => {
      const endDate = this.toDateStr(new Date());
      const startDate = this.addDays(endDate, -(days - 1));

      const rows = await this.aggRepo
        .createQueryBuilder('a')
        .select('a.region', 'region')
        .addSelect('SUM(a.total_count)', 'count')
        .where('a.aggDate BETWEEN :start AND :end', { start: startDate, end: endDate })
        .groupBy('a.region')
        .orderBy('count', 'DESC')
        .limit(top)
        .getRawMany();

      return {
        data: {
          items: rows.map((r) => ({
            region: r.region,
            count: parseInt(r.count || '0', 10),
          })),
          asOf: new Date().toISOString(),
        },
      };
    });
  }

  // ===================== Helpers =====================
  private resolveDate(date?: string): string {
    if (!date || date === 'today') return this.toDateStr(new Date());
    if (date === 'yesterday') return this.addDays(this.toDateStr(new Date()), -1);
    return date;
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
