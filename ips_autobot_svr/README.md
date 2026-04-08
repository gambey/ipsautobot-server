# ips_autobot_svr

Node.js 服务端项目：Express + mysql2 + MySQL 8（Docker）+ Swagger + api.md，RSA 加密登录，管理员/用户管理，登录日志（30MB×5 文件，可配置保留天数），用户充值。

---

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [环境变量](#环境变量)
- [主要接口](#主要接口)
- [接口文档](#接口文档)
- [数据库](#数据库)
- [日志](#日志)
- [常见问题](#常见问题)
- [相关文档](#相关文档)

---

## 环境要求

- **Node.js** 18+（建议 LTS，仅本地开发时需要）
- **Docker** 与 Docker Compose（用于运行 MySQL 与/或应用）

---

## 快速开始

### 方式一：全部用 Docker（推荐部署）

一键启动 MySQL + 应用容器：

```bash
docker-compose up -d --build
```

首次运行需先建表并创建初始管理员（在应用容器内执行）：

```bash
docker compose exec app node scripts/init-db.js
docker compose exec app node scripts/seed-admin.js
```

- 应用地址：<http://localhost:3000>
- 初始管理员：**用户名 `admin`，密码 `admin123`**（首次登录后请修改密码）
- 生产环境请设置环境变量 `JWT_SECRET`（可在宿主机建 `.env` 或在 compose 中配置），compose 中已用 `DB_HOST=mysql` 连接数据库

### 方式二：仅 Docker 跑 MySQL，本机跑 Node

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 MySQL

```bash
docker-compose up -d mysql
```

等待 MySQL 就绪（约 10–30 秒）后执行建表并创建初始管理员：

```bash
npm run db:init
npm run db:seed
```

初始管理员账号：**用户名 `admin`，密码 `admin123`**。首次登录后请尽快修改密码。

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，按需修改（本地开发可直接使用默认值）：

```bash
cp .env.example .env
```

### 4. 启动服务

```bash
npm start
# 或开发模式（代码变更自动重启）
npm run dev
```

服务默认运行在 `http://localhost:3000`。

### 5. 验证

- 健康检查：<http://localhost:3000/health>
- Swagger 文档：<http://localhost:3000/api-docs>
- 获取公钥：<http://localhost:3000/api/public-key>

---

## 项目结构

```
ips_autobot_svr/
├── .cursor/rules/          # Cursor 规则（接口变更时同步 api.md）
├── docs/                   # 文档与 OpenAPI 产物
│   ├── ARCHITECTURE.md     # 架构说明
│   ├── DEVELOPMENT.md      # 开发指南
│   ├── DEPLOYMENT.md       # 部署文档
│   ├── 需求变更（多软件支持）.md  # zhiling/yifei 双客户端说明与迁移
│   ├── MYSQL.md            # 进入 MySQL 控制台（Docker / 宿主机端口）
│   └── openapi.json       # 由脚本生成的 OpenAPI 规范
├── logs/                   # 登录日志文件（自动创建）
├── scripts/
│   ├── generate-api-md.js  # 生成 api.md
│   └── init-db.js          # 初始化数据库表
├── src/
│   ├── config/             # 配置（DB、JWT、RSA、Swagger）
│   ├── controllers/        # 路由控制器
│   ├── middleware/         # 认证、解密、错误处理
│   ├── routes/             # 路由与 JSDoc（Swagger 来源）
│   ├── services/           # 业务与数据库操作
│   ├── db/                 # 表结构 DDL
│   ├── utils/              # RSA、Winston 日志
│   ├── app.js              # Express 应用
│   └── server.js           # 启动入口
├── .env.example
├── .env.production.example # 生产环境变量模板（复制为服务器上的 .env）
├── api.md                  # 自动生成的接口文档（勿手改）
├── docker-compose.yml
├── docker-compose.prod.yml # 生产覆盖（不暴露 DB、应用仅本机 3000）
├── deploy/                 # 生产资源（Nginx 示例等）
├── package.json
└── README.md
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | MySQL 主机 | `localhost` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | 数据库用户 | `root` |
| `DB_PASSWORD` | 数据库密码（本地开发） | `gR7iKWTvQLLqhhwn` |
| `MYSQL_ROOT_PASSWORD` | Docker 中 MySQL root 与应用 `DB_PASSWORD`（Compose 注入） | 与 `DB_PASSWORD` 一致 |
| `DB_NAME` | 数据库名 | `ips_autobot` |
| `PORT` | 服务监听端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `JWT_SECRET` | JWT 签名密钥（生产务必修改） | 见 .env.example |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `RSA_PRIVATE_KEY_PEM` | RSA 私钥 PEM（可选，不填则启动时生成） | - |
| `RSA_PUBLIC_KEY_PEM` | RSA 公钥 PEM（与私钥成对使用） | - |
| `LOG_RETENTION_DAYS` | 登录日志文件保留天数 | `30` |

---

## 主要接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/public-key` | 获取 RSA 公钥（加密密码用） | 否 |
| POST | `/api/admin/login` | 管理员登录 | 否 |
| POST | `/api/admin` | 创建管理员（仅超级管理员） | 管理员 JWT |
| PUT | `/api/admin/password` | 管理员修改密码 | 管理员 JWT |
| POST | `/api/users` | 创建用户 | 否 |
| POST | `/api/users/login` | 用户登录 | 否 |
| PUT | `/api/users/:id` | 编辑用户信息（仅超级管理员） | 管理员 JWT |
| PUT | `/api/users/password` | 用户/管理员修改密码 | 用户或管理员 JWT |
| GET | `/api/users/mac` | 查询当前或指定用户绑定的 MAC | 用户或管理员 JWT |
| PUT | `/api/users/mac` | 绑定/更新 MAC（全局唯一） | 用户或管理员 JWT |
| POST | `/api/users/mac/verify` | 校验提交的 MAC 是否与绑定一致 | 用户 JWT |
| POST | `/api/score/change` | 积分增加/扣减（仅管理员） | 管理员 JWT |
| GET | `/api/score/records` | 积分记录查询（管理员全量、用户仅本人） | 用户或管理员 JWT |
| PUT | `/api/users/:id/disable` | 禁用用户 | 管理员 JWT |
| GET | `/api/logs/admin-login` | 管理员登录日志列表 | 管理员 JWT |
| GET | `/api/logs/user-login` | 用户登录日志列表 | 管理员 JWT |
| POST | `/api/recharge` | 创建充值记录 | 用户或管理员 JWT |
| GET | `/api/recharge` | 充值记录列表 | 用户或管理员 JWT |

密码相关字段（如 `passwordEncrypted`）均需使用 **RSA 公钥**加密后传输，请先调用 `GET /api/public-key` 获取公钥。

---

## 接口文档

- **Swagger UI**：<http://localhost:3000/api-docs>（可在线调试）
- **api.md**：项目根目录，由 `npm run docs:api-md` 从 OpenAPI 规范生成，用于与前端/客户端对齐接口。

修改任何接口后，请执行：

```bash
npm run docs:api-md
```

并提交更新后的 `api.md`。详见 [开发指南](docs/DEVELOPMENT.md) 与 `.cursor/rules/api-docs-sync.mdc`。

---

## 数据库

- **引擎**：MySQL 8.0，建议使用 Docker 运行（见 `docker-compose.yml`）。
- **库名**：`ips_autobot`（可由 `DB_NAME` 覆盖）。
- **表**：`admins`、`users`、`recharge_records_zhiling`、`recharge_records_yifei`、`score_record`、`admin_login_logs`、`user_login_logs`。DDL 见 `src/db/schema.sql`。
- **初始化**：首次部署执行 `npm run db:init`。若库表已存在且需为用户表增加「用户名」字段，执行一次 `npm run db:migrate-user-username`；若需增加用户网卡 MAC 字段与唯一索引，执行一次 `npm run db:migrate-user-mac`；若需增加积分字段与积分记录表，执行一次 `npm run db:migrate-user-score`；若需增加管理员分级字段，执行一次 `npm run db:migrate-admin-type`。

---

## 日志

- **管理员登录**：`logs/admin-login-YYYY-MM-DD.log`
- **用户登录**：`logs/user-login-YYYY-MM-DD.log`
- **策略**：单文件最大 30MB，最多保留 5 个文件；超过 `LOG_RETENTION_DAYS` 天的文件会被定时清理。
- **库表**：每次登录同时写入上述日志文件及 `admin_login_logs` / `user_login_logs`，列表接口从数据库查询。

---

## 常见问题

**Q: `docker-compose up -d` 报错：failed to resolve reference "docker.io/library/mysql:8.0" / connectex / 连接超时**  
A: 无法访问 Docker Hub 拉取镜像，可任选其一解决：

1. **配置 Docker 镜像加速（推荐）**  
   Docker Desktop → Settings → Docker Engine，在 JSON 中加入 `registry-mirrors`，例如：
   ```json
   {
     "registry-mirrors": [
       "https://docker.1ms.run",
       "https://docker.xuanyuan.me"
     ]
   }
   ```
   保存后 Apply & Restart，再执行 `docker-compose up -d`。  
   其他可用镜像源（需自行确认可用性）：阿里云容器镜像服务、腾讯云、中科大等。

2. **直接使用国内镜像地址**  
   若不想改 Docker 配置，可把 `docker-compose.yml` 里 MySQL 的 `image` 改为镜像站中的同名镜像，例如：
   ```yaml
   image: docker.1ms.run/mysql:8.0
   ```
   或使用你当前环境可访问的镜像地址。保存后重新执行 `docker-compose up -d`。

**Q: 构建应用镜像时报错 `failed size validation: ... != ... : failed precondition` 或拉取 node 镜像失败**  
A: 多为镜像层校验失败或网络问题。可依次尝试：  
1) 清理构建缓存后重试：`docker builder prune -f`，再执行 `docker-compose up -d --build`。  
2) 使用 Dockerfile 内置的备用基础镜像（已改为 `node:18-bookworm-slim`）。  
3) 项目 Dockerfile 已默认使用镜像源 `docker.1ms.run/node:18-alpine`，直接执行 `docker-compose up -d --build` 即可；若本机可直连 Docker Hub，可改为 `docker compose build --build-arg NODE_IMAGE=node:18-alpine` 再 up。

**Q: 启动报错 `ECONNREFUSED` 或 `connect ETIMEDOUT`**  
A: 确认 MySQL 已启动（`docker-compose up -d`），且 `DB_HOST`/`DB_PORT` 与 Docker 映射一致；若本机连接容器内 MySQL，使用 `localhost:3306`。

**Q: 如何生成第一个管理员？**  
A: 执行 `npm run db:seed` 会创建初始管理员（用户名 `admin`，密码 `admin123`）；若该用户已存在则跳过。首次登录后请通过 `PUT /api/admin/password` 修改密码。

**Q: 客户端如何加密密码？**  
A: 调用 `GET /api/public-key` 获取 PEM 公钥，使用各语言 RSA 库用该公钥加密明文密码，将 Base64 结果放在请求体的 `passwordEncrypted`（或 `oldPasswordEncrypted`/`newPasswordEncrypted`）中。

**Q: api.md 可以手动改吗？**  
A: 不可以。`api.md` 由 OpenAPI 规范自动生成，修改会在下次执行 `npm run docs:api-md` 时被覆盖。接口变更请改路由中的 JSDoc 或 `src/config/swagger.js`，再重新生成。

---

## 相关文档

- [架构说明](docs/ARCHITECTURE.md) — 技术架构、数据流、模块职责
- [开发指南](docs/DEVELOPMENT.md) — 本地开发、接口文档同步、调试说明
- [部署文档](docs/DEPLOYMENT.md) — Docker 部署、初始化、升级与回滚（含 `docker-compose.prod.yml`、`.env.production.example`）
- [MySQL 控制台](docs/MYSQL.md) — 进入 `mysql` 客户端的步骤与命令（含生产仅容器内连接）
- [需求变更（多软件支持）](docs/需求变更（多软件支持）.md) — 智灵/翼飞双客户端、迁移、`app` 参数与积分策略调整
