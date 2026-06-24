import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AggregationService } from './aggregation.service';
import { TicRecord } from '../metrics/entities/tic-record.entity';
import { TicAggregateDaily } from '../metrics/entities/tic-aggregate-daily.entity';
import { MetaRefreshLog } from '../metrics/entities/meta-refresh-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicRecord, TicAggregateDaily, MetaRefreshLog])],
  providers: [AggregationService],
  exports: [AggregationService],
})
export class AggregationModule {}
