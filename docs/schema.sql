-- TIC Analysis Platform - DB Schema
-- 2026-06-24

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: tic_records (raw records, written by data collection agent)
CREATE TABLE IF NOT EXISTS tic_records (
  id              BIGSERIAL PRIMARY KEY,
  record_date     DATE NOT NULL,
  category        VARCHAR(32) NOT NULL,            -- testing / inspection / certification
  region          VARCHAR(64) NOT NULL,            -- CN-East / CN-South / US / EU ...
  org_name        VARCHAR(255),
  status          VARCHAR(32) NOT NULL,            -- pending / in_progress / passed / failed
  amount          NUMERIC(12,2),
  turnaround_days INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_date ON tic_records (record_date);
CREATE INDEX IF NOT EXISTS idx_records_category_date ON tic_records (category, record_date);
CREATE INDEX IF NOT EXISTS idx_records_region_date ON tic_records (region, record_date);
CREATE INDEX IF NOT EXISTS idx_records_status ON tic_records (status);

-- Table 2: tic_aggregates_daily (pre-computed daily aggregates)
CREATE TABLE IF NOT EXISTS tic_aggregates_daily (
  id              BIGSERIAL PRIMARY KEY,
  agg_date        DATE NOT NULL,
  category        VARCHAR(32) NOT NULL,
  region          VARCHAR(64) NOT NULL,
  total_count     INT NOT NULL DEFAULT 0,
  passed_count    INT NOT NULL DEFAULT 0,
  failed_count    INT NOT NULL DEFAULT 0,
  pending_count   INT NOT NULL DEFAULT 0,
  in_progress_count INT NOT NULL DEFAULT 0,
  avg_turnaround  NUMERIC(6,2),
  total_amount    NUMERIC(14,2),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agg_date, category, region)
);

CREATE INDEX IF NOT EXISTS idx_agg_date ON tic_aggregates_daily (agg_date);
CREATE INDEX IF NOT EXISTS idx_agg_category_date ON tic_aggregates_daily (category, agg_date);
CREATE INDEX IF NOT EXISTS idx_agg_region_date ON tic_aggregates_daily (region, agg_date);

-- Table 3: meta_refresh_log
CREATE TABLE IF NOT EXISTS meta_refresh_log (
  id              BIGSERIAL PRIMARY KEY,
  source          VARCHAR(64) NOT NULL,
  status          VARCHAR(16) NOT NULL,
  record_count    INT,
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_started ON meta_refresh_log (started_at DESC);
