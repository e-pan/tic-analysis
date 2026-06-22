# 技术架构方案 — TIC Analysis Platform

> **任务ID**: T20260622-1457-architect
> **作者**: Linus (Architect)
> **输入**: Steve 的 PRD v0.1.0
> **状态**: ✅ Ready for Coder 开发
> **创建时间**: 2026-06-22

---

## 1. 架构总览

### 1.1 一句话
**前后端分离 + SSR 友好 + 单一数据源 + Redis 缓存 + 第二个采集 Agent 只读 DB**。

### 1.2 系统拓扑

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器 (公开访问, 无登录)                                      │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  前端 (Vue 3 + Vite + Element Plus + ECharts)                  │
│  - 单页仪表盘                                                  │
│  - SSR (可选, 提升 SEO + 首屏)                                  │
│  - 自动刷新 (5min)                                             │
└──────────────────┬───────────────────────────────────────────┘
                   │ REST API
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  后端 (NestJS)                                                 │
│  - /api/metrics/kpi       → 4 个 KPI                           │
│  - /api/metrics/trend     → 趋势数据                           │
│  - /api/metrics/category  → 类别分布                           │
│  - /api/metrics/region    → 地区分布                           │
│  - /api/health            → 健康检查                           │
│                                                                   │
│  中间件: Helmet / CORS / RateLimit / Sentry                      │
└──────────────────┬───────────────────────────────────────────┘
                   │ TypeORM / Prisma
        ┌──────────┴──────────┐
        ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  PostgreSQL     │   │  Redis          │
│  (主数据源)      │   │  (5min 缓存)     │
└────────▲────────┘   └─────────────────┘
         │ 只读
         │
┌────────┴───────────────────────────────┐
│  第二个 Agent (数据采集器) — 仅写权限  │
│  - 每日定时采集 TIC 行业数据            │
│  - 写入 tic_records / tic_aggregates   │
└────────────────────────────────────────┘
```

### 1.3 关键技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| **前端框架** | Vue 3 + Vite + TS | 沿用 AI Portal，统一栈 |
| **UI 库** | Element Plus + 自研 Design Tokens | 与 AI Portal 一致 |
| **图表库** | ECharts 5 | 行业标准，体积可控 |
| **SSR** | MVP 暂不启用，预渲染 SEO 静态页 | 时间紧，SSR 调试成本高 |
| **后端框架** | NestJS + TypeORM | 与 AI Portal 一致 |
| **数据库** | PostgreSQL 15 | 与 AI Portal 一致 |
| **缓存** | Redis 7 | 聚合查询 5min TTL |
| **鉴权** | MVP 无（公开访问） | 简化 |
| **部署** | PM2 + Nginx（同 AI Portal 服务器） | 复用基础设施 |
| **监控** | Sentry（前后端） | 与 AI Portal 一致 |

---

## 2. 项目结构

```
tic-analysis/
├── docs/
│   ├── PRD.md
│   ├── architecture.md          # 本文件
│   ├── api.md                   # API 详细文档
│   └── schema.sql               # DB Schema
├── backend/                     # NestJS
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   └── metrics/
│   │   │       ├── metrics.module.ts
│   │   │       ├── metrics.controller.ts
│   │   │       ├── metrics.service.ts
│   │   │       └── dto/
│   │   ├── common/
│   │   │   ├── filters/         # 异常过滤
│   │   │   ├── interceptors/    # 缓存拦截器
│   │   │   └── pipes/
│   │   └── config/
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── frontend/                    # Vue 3
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── views/
│   │   │   └── Dashboard.vue
│   │   ├── components/
│   │   │   ├── KpiCard.vue
│   │   │   ├── TrendChart.vue
│   │   │   ├── CategoryPie.vue
│   │   │   └── RegionBar.vue
│   │   ├── composables/
│   │   │   └── useAutoRefresh.ts
│   │   ├── api/
│   │   │   └── metrics.ts
│   │   ├── stores/
│   │   └── styles/
│   │       └── tokens.css       # Design Tokens
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── deploy/
│   ├── nginx.conf
│   ├── ecosystem.config.js      # PM2
│   └── deploy.sh
├── docker-compose.yml           # PG + Redis (dev)
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. 数据库设计

### 3.1 表结构（PostgreSQL）

#### 表 1: `tic_records`（原始记录，由第二个 Agent 写入）
```sql
CREATE TABLE tic_records (
  id              BIGSERIAL PRIMARY KEY,
  record_date     DATE NOT NULL,                    -- 业务日期
  category        VARCHAR(32) NOT NULL,             -- testing / inspection / certification
  region          VARCHAR(64) NOT NULL,             -- 地区编码 (CN/US/EU...)
  org_name        VARCHAR(255),                     -- 客户/送检方
  status          VARCHAR(32) NOT NULL,             -- pending / in_progress / passed / failed
  amount          NUMERIC(12,2),                    -- 检测金额
  turnaround_days INT,                              -- 实际交付天数
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：MVP 阶段查询热点
CREATE INDEX idx_records_date ON tic_records (record_date);
CREATE INDEX idx_records_category_date ON tic_records (category, record_date);
CREATE INDEX idx_records_region_date ON tic_records (region, record_date);
CREATE INDEX idx_records_status ON tic_records (status);
```

#### 表 2: `tic_aggregates_daily`（每日聚合，预计算）
```sql
CREATE TABLE tic_aggregates_daily (
  id              BIGSERIAL PRIMARY KEY,
  agg_date        DATE NOT NULL,
  category        VARCHAR(32) NOT NULL,
  region          VARCHAR(64) NOT NULL,
  total_count     INT NOT NULL DEFAULT 0,
  passed_count    INT NOT NULL DEFAULT 0,
  failed_count    INT NOT NULL DEFAULT 0,
  pending_count   INT NOT NULL DEFAULT 0,
  avg_turnaround  NUMERIC(6,2),
  total_amount    NUMERIC(14,2),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agg_date, category, region)
);

CREATE INDEX idx_agg_date ON tic_aggregates_daily (agg_date);
```

#### 表 3: `meta_refresh_log`（数据刷新追踪，可选）
```sql
CREATE TABLE meta_refresh_log (
  id              BIGSERIAL PRIMARY KEY,
  source          VARCHAR(64) NOT NULL,
  status          VARCHAR(16) NOT NULL,           -- success / failed
  record_count    INT,
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ,
  error_message   TEXT
);
```

### 3.2 数据流

```
第二个 Agent → tic_records (写)
                       ↓ (每天凌晨 03:00 触发, 由 Agent 侧实现)
                       ↓
                tic_aggregates_daily (聚合)
                       ↓
                  Backend API
                       ↓
                Redis (5min TTL)
                       ↓
                  Frontend
```

> **假设 #1**: 第二个 Agent 负责 `tic_records` 写入 + `tic_aggregates_daily` 预聚合。如果 Agent 只写原始数据，后端需提供聚合任务（待确认）。

---

## 4. API 设计

### 4.1 通用约定

- Base URL: `/api`
- Content-Type: `application/json`
- 时间格式: ISO 8601
- 时区: UTC（前端展示时转 Asia/Shanghai）
- 错误响应: `{ code: string, message: string, details?: any }`

### 4.2 端点清单

#### `GET /api/metrics/kpi`
KPI 卡片数据

**Query**:
| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| date | string | 否 | today | YYYY-MM-DD, "today", "yesterday" |

**Response**:
```json
{
  "data": {
    "totalCount": 12453,
    "totalCountDelta": 12.5,        // 同比 %
    "passRate": 0.892,
    "passRateDelta": 1.2,
    "inProgressCount": 234,
    "inProgressDelta": -3.4,
    "avgTurnaroundDays": 5.6,
    "avgTurnaroundBenchmark": 7.2,
    "asOf": "2026-06-22T07:00:00Z"
  }
}
```

#### `GET /api/metrics/trend`
趋势数据（折线图）

**Query**:
| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| range | string | 否 | "7d" | "7d" / "30d" / "90d" |
| category | string | 否 | all | testing/inspection/certification/all |

**Response**:
```json
{
  "data": {
    "series": [
      {
        "date": "2026-06-16",
        "testing": 1230,
        "inspection": 890,
        "certification": 456
      }
    ],
    "asOf": "2026-06-22T07:00:00Z"
  }
}
```

#### `GET /api/metrics/category`
类别分布（饼图）

**Query**:
| 参数 | 类型 | 必填 | 默认 |
|------|------|------|------|
| range | string | 否 | "30d" |

**Response**:
```json
{
  "data": {
    "items": [
      { "category": "testing", "count": 45230, "percentage": 52.3 },
      { "category": "inspection", "count": 28910, "percentage": 33.4 },
      { "category": "certification", "count": 12340, "percentage": 14.3 }
    ],
    "asOf": "2026-06-22T07:00:00Z"
  }
}
```

#### `GET /api/metrics/region`
地区分布（柱状图）

**Query**:
| 参数 | 类型 | 必填 | 默认 |
|------|------|------|------|
| range | string | 否 | "30d" |
| top | int | 否 | 10 |

**Response**:
```json
{
  "data": {
    "items": [
      { "region": "CN-East", "count": 32100 },
      { "region": "CN-South", "count": 28900 },
      ...
    ],
    "asOf": "2026-06-22T07:00:00Z"
  }
}
```

#### `GET /api/health`
健康检查（无缓存）

**Response**:
```json
{ "status": "ok", "db": "ok", "redis": "ok", "uptime": 12345 }
```

---

## 5. 缓存策略

### 5.1 Redis 键设计

| Key 模式 | TTL | 触发 |
|---------|-----|------|
| `tic:kpi:{date}` | 300s | 每次 API 调用 miss 时计算 |
| `tic:trend:{range}:{category}` | 300s | 同上 |
| `tic:category:{range}` | 300s | 同上 |
| `tic:region:{range}:{top}` | 300s | 同上 |

### 5.2 失效策略
- 后端**不主动失效**缓存，依赖 5min TTL 自然过期
- 优点：实现简单
- 缺点：第二个 Agent 写入新数据后，最长延迟 5min 可见
- 接受度：MVP 范围内，符合"5 分钟实时"定义

---

## 6. 前端架构

### 6.1 页面结构
单页面 + 4 区块：
1. Header (Logo + 语言切换占位 + 最后更新时间)
2. FilterBar (时间筛选 / 类别筛选)
3. KpiGrid (4 张卡片)
4. ChartRow (趋势 + 饼图)
5. ChartFullWidth (地区分布)

### 6.2 关键组件

| 组件 | 职责 | Props |
|------|------|-------|
| `KpiCard.vue` | 单个 KPI 卡片 | title, value, delta, suffix |
| `TrendChart.vue` | ECharts 折线图 | series, categories |
| `CategoryPie.vue` | ECharts 饼图 | items |
| `RegionBar.vue` | ECharts 横向柱状图 | items |
| `FilterBar.vue` | 时间/类别筛选 | v-model:dateRange, v-model:category |
| `useAutoRefresh.ts` | 自动刷新 composable | interval (default 300000) |

### 6.3 Design Tokens（沿用 AI Portal）
```css
:root {
  --color-brand: #ca4300;
  --color-accent: #f49000;
  --color-bg-primary: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

---

## 7. 性能与可观测性

### 7.1 性能目标
| 指标 | 目标 | 监控 |
|------|------|------|
| 首屏 FCP | < 1.5s | Lighthouse |
| API P95 | < 300ms | Sentry Performance |
| Redis 命中率 | > 80% | 自定义 metric |
| DB 查询 | < 100ms | Sentry |

### 7.2 错误处理
- DB 不可用：返回 503 + 上次缓存数据（前端降级显示"数据可能滞后"）
- Redis 不可用：直接走 DB，告警
- 第二个 Agent 失败：不影响 API，对 `meta_refresh_log` 记录告警

---

## 8. 部署架构

### 8.1 服务端口（假设沿用 AI Portal 服务器）
| 服务 | 端口 | 备注 |
|------|------|------|
| Frontend (Nginx) | 5174 | 新端口，避免与 AI Portal (5173) 冲突 |
| Backend (NestJS) | 3001 | 新端口，避免与 AI Portal (3000) 冲突 |
| PostgreSQL | 5432 | 复用现有实例，新建 DB `tic_analysis` |
| Redis | 6379 | 复用现有实例，使用 DB index 2（区分） |

### 8.2 部署命令
```bash
# 后端
cd backend && npm install --production && npm run build
pm2 start dist/main.js --name tic-analysis-api -i 1

# 前端
cd frontend && npm install && npm run build
cp -r dist/* /var/www/tic-analysis/

# Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/tic-analysis
sudo ln -s /etc/nginx/sites-available/tic-analysis /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 8.3 环境变量
```env
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/tic_analysis
REDIS_URL=redis://localhost:6379/2
PORT=3001
SENTRY_DSN=https://xxx@sentry.io/xxx
NODE_ENV=production

# Frontend (build-time)
VITE_API_BASE_URL=https://tic.example.com/api
```

---

## 9. 风险与假设

### 9.1 假设清单（需 Ken 确认）
| # | 假设 | 不成立的后果 |
|---|------|-------------|
| A1 | 第二个 Agent 已就绪 / 本周内可对接 | 需提供 mock 数据 |
| A2 | 第二个 Agent 写 `tic_records` + 预聚合 | 后端需补聚合任务 |
| A3 | DB 可独立部署或共用现有 PG | 影响环境准备时间 |
| A4 | 服务器资源允许新增 2 个端口 | 可能需协调 |
| A5 | 沿用 AI Portal 服务器 (150.158.21.209) | 域名/证书问题 |

### 9.2 风险
| 风险 | 等级 | 缓解 |
|------|------|------|
| 第二个 Agent 表结构不一致 | 🔴 | Coder 先用 mock 数据，schema 设计兼容 (category 字段自由扩展) |
| SSR 调试耗时 | 🟢 | MVP 不上 SSR |
| Redis 命中低 | 🟡 | TTL 5min + 单一 API 用户场景下应该足够 |
| Nginx 配置错误 | 🟡 | 复用 AI Portal 模板，仅改端口 |

---

## 10. 开发任务清单（移交 Coder）

按优先级：

| # | 任务 | 估时 | 阻塞 |
|---|------|------|------|
| 1 | 后端项目骨架 (NestJS + TS + ESLint) | 30min | 无 |
| 2 | DB schema + TypeORM entities + 种子数据 | 1h | 无 |
| 3 | Metrics Service 4 个端点 (含 Redis 缓存) | 2h | 任务 1, 2 |
| 4 | 前端项目骨架 (Vue 3 + Vite + Element Plus + ECharts) | 30min | 无 |
| 5 | Dashboard 页面 + 4 个组件 | 2h | 任务 4 |
| 6 | 自动刷新 + 筛选交互 | 30min | 任务 5 |
| 7 | Docker Compose (dev 环境 PG + Redis) | 30min | 无 |
| 8 | 部署脚本 + Nginx + PM2 | 30min | 任务 7 |
| 9 | README + 环境变量样例 | 20min | 无 |

总计: ~8h 开发 + 1-2h 部署调试

---

## 11. Deliverables（移交清单）

- [x] 架构方案（本文件）
- [x] DB Schema (在第 3 节)
- [x] API 文档（在第 4 节）
- [ ] 前端组件清单（在第 6.2 节）
- [ ] 部署脚本（Coder 任务 8）

---

**auto_trigger**: true → 通知 Coder 启动开发
**blocker**: 第 9.1 节的 5 个假设不阻塞开发，Coder 应**基于合理假设启动 + 标注假设点**，等数据采集 Agent 就绪后微调

— Linus (Architect) 🤓