import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { TicRecord } from './entities/tic-record.entity';
import { TicAggregateDaily } from './entities/tic-aggregate-daily.entity';
import { MetaRefreshLog } from './entities/meta-refresh-log.entity';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([TicRecord, TicAggregateDaily, MetaRefreshLog]), CacheModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
