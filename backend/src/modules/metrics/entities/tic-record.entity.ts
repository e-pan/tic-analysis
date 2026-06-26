import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('tic_records')
@Index('idx_records_date', ['recordDate'])
@Index('idx_records_category_date', ['category', 'recordDate'])
@Index('idx_records_region_date', ['region', 'recordDate'])
@Index('idx_records_status', ['status'])
export class TicRecord {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'record_date', type: 'date' })
  recordDate: string;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'varchar', length: 64 })
  region: string;

  @Column({ name: 'org_name', type: 'varchar', length: 255, nullable: true })
  orgName: string | null;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  amount: number | null;

  @Column({ name: 'turnaround_days', type: 'int', nullable: true })
  turnaroundDays: number | null;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
