import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('meta_refresh_log')
@Index('idx_refresh_started', ['startedAt'])
export class MetaRefreshLog {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'varchar', length: 64 })
  source: string;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ name: 'record_count', type: 'int', nullable: true })
  recordCount: number | null;

  @Column({ name: 'started_at', type: 'datetime' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;
}
