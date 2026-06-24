import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';

@Entity('tic_aggregates_daily')
@Unique('uq_agg_date_cat_region', ['aggDate', 'category', 'region'])
@Index('idx_agg_date', ['aggDate'])
@Index('idx_agg_category_date', ['category', 'aggDate'])
@Index('idx_agg_region_date', ['region', 'aggDate'])
export class TicAggregateDaily {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'agg_date', type: 'date' })
  aggDate: string;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'varchar', length: 64 })
  region: string;

  @Column({ name: 'total_count', type: 'int', default: 0 })
  totalCount: number;

  @Column({ name: 'passed_count', type: 'int', default: 0 })
  passedCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'pending_count', type: 'int', default: 0 })
  pendingCount: number;

  @Column({ name: 'in_progress_count', type: 'int', default: 0 })
  inProgressCount: number;

  @Column({ name: 'avg_turnaround', type: 'numeric', precision: 6, scale: 2, nullable: true })
  avgTurnaround: number | null;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalAmount: number | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
