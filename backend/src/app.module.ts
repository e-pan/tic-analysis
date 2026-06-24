import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TicRecord } from './modules/metrics/entities/tic-record.entity';
import { TicAggregateDaily } from './modules/metrics/entities/tic-aggregate-daily.entity';
import { MetaRefreshLog } from './modules/metrics/entities/meta-refresh-log.entity';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HealthModule } from './modules/health/health.module';
import { AggregationModule } from './modules/aggregation/aggregation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        entities: [TicRecord, TicAggregateDaily, MetaRefreshLog],
        synchronize: false, // schema 用 SQL 手工管理
        logging: cfg.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),

    // Rate limit
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        { ttl: 60_000, limit: parseInt(cfg.get('RATE_LIMIT') || '60', 10) },
      ],
    }),

    ScheduleModule.forRoot(),

    MetricsModule,
    HealthModule,
    AggregationModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
