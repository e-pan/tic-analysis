# TIC Analysis Platform

> **TIC** (Testing, Inspection, Certification) 行业实时数据分析平台  
> **Status**: 🚧 v0.1.0 开发中  
> **Stack**: Vue 3 + NestJS + PostgreSQL + Redis  
> **架构文档**: [docs/architecture.md](docs/architecture.md) | **PRD**: [docs/PRD.md](docs/PRD.md)

## 🚀 快速启动 (开发)

```bash
# 1. 启动 dev 依赖 (PG + Redis)
docker compose up -d

# 2. 后端
cd backend
cp .env.example .env
npm install
npm run start:dev

# 3. 前端
cd frontend
npm install
npm run dev
```

- 前端: <http://localhost:5174>
- 后端 API: <http://localhost:3001/api>
- Health: <http://localhost:3001/api/health>

## 📦 生产部署

```bash
# 见 deploy/deploy.sh
bash deploy/deploy.sh
```

## 🗂 目录结构

```
tic-analysis/
├── backend/          # NestJS API
├── frontend/         # Vue 3 仪表盘
├── deploy/           # Nginx + PM2 + 部署脚本
├── docs/             # PRD + 架构 + DB schema
└── docker-compose.yml
```

## 🔑 环境变量

见 `backend/.env.example` 与 `frontend/.env.example`。

## 📝 维护

- **Owner**: Claw 🤖
- **最后更新**: 2026-06-24
