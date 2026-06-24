-- Seed mock data for TIC Analysis Platform
-- 生成 90 天的测试数据 (5 categories × 6 regions × 90 days)
-- 仅用于开发与演示

INSERT INTO tic_records (record_date, category, region, org_name, status, amount, turnaround_days)
SELECT
  CURRENT_DATE - (day_offset || ' days')::interval AS record_date,
  cat,
  reg,
  'Org-' || (day_offset % 50) AS org_name,
  CASE (random() * 10)::int
    WHEN 0 THEN 'failed'
    WHEN 1 THEN 'failed'
    WHEN 2 THEN 'pending'
    WHEN 3 THEN 'in_progress'
    ELSE 'passed'
  END AS status,
  (random() * 5000 + 500)::numeric(12,2) AS amount,
  (random() * 10 + 2)::int AS turnaround_days
FROM
  generate_series(0, 89) AS day_offset,
  unnest(ARRAY['testing','inspection','certification']) AS cat,
  unnest(ARRAY['CN-East','CN-South','CN-North','CN-West','US','EU']) AS reg,
  generate_series(1, 20) AS _  -- 每天每个地区每个类别 20 条
ON CONFLICT DO NOTHING;
