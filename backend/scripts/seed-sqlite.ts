/**
 * Seed SQLite with 90 days × 5 categories × 6 regions of mock data.
 * Run via: npx ts-node scripts/seed-sqlite.ts
 * or after build: node dist/scripts/seed-sqlite.js
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

import { TicRecord } from '../src/modules/metrics/entities/tic-record.entity';
import { TicAggregateDaily } from '../src/modules/metrics/entities/tic-aggregate-daily.entity';
import { MetaRefreshLog } from '../src/modules/metrics/entities/meta-refresh-log.entity';

dotenv.config();

const CATEGORIES = ['testing', 'inspection', 'certification', 'audit', 'verification'];
const REGIONS = ['CN-East', 'CN-South', 'CN-North', 'US', 'EU', 'SEA'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickStatus(): string {
  const r = randomInt(0, 9);
  if (r <= 1) return 'failed';
  if (r === 2) return 'pending';
  if (r === 3) return 'in_progress';
  return 'passed';
}

async function main() {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  if (dbType !== 'sqlite') {
    console.error(`[seed-sqlite] DB_TYPE=${dbType} is not sqlite. Aborting.`);
    process.exit(1);
  }
  const dbPath = process.env.SQLITE_PATH || './data/dev.sqlite';
  const absPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });

  const ds = new DataSource({
    type: 'better-sqlite3',
    database: absPath,
    entities: [TicRecord, TicAggregateDaily, MetaRefreshLog],
    synchronize: true,
  });

  await ds.initialize();
  console.log(`[seed-sqlite] connected: ${absPath}`);

  const recRepo = ds.getRepository(TicRecord);
  const aggRepo = ds.getRepository(TicAggregateDaily);

  // Wipe
  await recRepo.clear();
  await aggRepo.clear();

  // Insert 90 days × 5 categories × 6 regions = 2700 raw records
  const records: Partial<TicRecord>[] = [];
  const today = new Date();
  for (let d = 0; d < 90; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    for (const cat of CATEGORIES) {
      for (const reg of REGIONS) {
        records.push({
          recordDate: dateStr,
          category: cat,
          region: reg,
          orgName: `Org-${randomInt(1, 50)}`,
          status: pickStatus(),
          amount: +(Math.random() * 5000 + 500).toFixed(2),
          turnaroundDays: randomInt(2, 12),
        });
      }
    }
  }
  // batch insert in chunks (better-sqlite3 limit ~999)
  for (let i = 0; i < records.length; i += 500) {
    await recRepo.save(records.slice(i, i + 500));
  }
  console.log(`[seed-sqlite] inserted ${records.length} tic_records`);

  // Compute daily aggregates
  const map = new Map<string, Partial<TicAggregateDaily>>();
  for (const r of records) {
    const key = `${r.recordDate}|${r.category}|${r.region}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        aggDate: r.recordDate!,
        category: r.category!,
        region: r.region!,
        totalCount: 0,
        passedCount: 0,
        failedCount: 0,
        pendingCount: 0,
        inProgressCount: 0,
        totalAmount: 0,
      };
      map.set(key, agg);
    }
    agg.totalCount! += 1;
    if (r.status === 'passed') agg.passedCount! += 1;
    else if (r.status === 'failed') agg.failedCount! += 1;
    else if (r.status === 'pending') agg.pendingCount! += 1;
    else if (r.status === 'in_progress') agg.inProgressCount! += 1;
    agg.totalAmount = +(agg.totalAmount! + (r.amount || 0)).toFixed(2);
  }
  // avg turnaround
  const turnMap = new Map<string, { sum: number; n: number }>();
  for (const r of records) {
    const key = `${r.recordDate}|${r.category}|${r.region}`;
    const cur = turnMap.get(key) || { sum: 0, n: 0 };
    cur.sum += r.turnaroundDays || 0;
    cur.n += 1;
    turnMap.set(key, cur);
  }
  const aggs = Array.from(map.values()).map((a) => {
    const t = turnMap.get(`${a.aggDate}|${a.category}|${a.region}`)!;
    a.avgTurnaround = +(t.sum / t.n).toFixed(2);
    return a;
  });
  for (let i = 0; i < aggs.length; i += 500) {
    await aggRepo.save(aggs.slice(i, i + 500));
  }
  console.log(`[seed-sqlite] inserted ${aggs.length} tic_aggregates_daily`);

  await ds.destroy();
  console.log(`[seed-sqlite] done.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
