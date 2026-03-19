# 架构说明

本文档描述 ips_autobot_svr 的技术架构、数据流与模块职责。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 运行时 | Node.js 18+ | 服务端运行环境 |
| 框架 | Express | HTTP 服务与路由 |
| 数据库 | MySQL 8.0 + mysql2 | 持久化，Promise API 连接池 |
| 认证 | JWT | 登录后签发，保护接口 |
| 密码传输 | RSA | 客户端公钥加密，服务端私钥解密 |
| 密码存储 | bcryptjs | 仅存哈希，不明文 |
| 文档 | swagger-jsdoc + swagger-ui-express | OpenAPI 3.0，Swagger UI |
| 文档导出 | openapi-to-md | 从 OpenAPI 生成 api.md |
| 日志 | winston + winston-daily-rotate-file | 按日轮转，30MB×5 文件 |

---

## 整体数据流

```
客户端
  │
  │  1. GET /api/public-key 获取公钥
  │  2. 使用公钥加密密码
  │  3. POST 登录/注册/改密（body 中带 passwordEncrypted）
  ▼
Express
  │
  ├─ decryptPassword 中间件：RSA 解密 → req.body.password
  ├─ auth 中间件：校验 JWT → req.auth (id, role)
  ▼
Controller → Service → mysql2 连接池 → MySQL
  │
  ├─ 登录成功：写 Winston 日志 + 写 admin_login_logs / user_login_logs
  └─ 响应：JWT + 用户/管理员信息
```

---

## 目录与模块职责

### `src/config/`

- **index.js**：从环境变量读取并导出配置（DB、JWT、RSA、日志保留天数等）。
- **db.js**：创建并导出 mysql2 连接池。
- **swagger.js**：OpenAPI 3.0 的 definition 与 apis 路径，供 swagger-jsdoc 生成规范。

### `src/middleware/`

- **auth.js**：JWT 签发/校验、`authMiddleware`、`requireAdmin`、`requireUserOrAdmin`。
- **decryptPassword.js**：对 `passwordEncrypted` / `oldPasswordEncrypted` / `newPasswordEncrypted` 做 RSA 解密，写入 `req.body.password` 等。
- **errorHandler.js**：统一 4xx/5xx JSON 错误响应。

### `src/routes/`

- **auth.js**：`GET /api/public-key`（公钥）。
- **admin.js**：管理员登录、创建管理员、修改密码。
- **user.js**：用户创建、登录、修改密码、禁用。
- **logs.js**：管理员/用户登录日志列表。
- **recharge.js**：充值记录创建与列表。

路由文件中包含 JSDoc `@openapi` 注释，是 Swagger 与 api.md 的单一数据源之一。

### `src/controllers/`

处理请求、调用 service、写登录日志（Winston + DB）、返回 JSON。不直接写 SQL，由 service 封装。

### `src/services/`

- **adminService.js**：管理员 CRUD、密码校验、最后登录时间更新。
- **userService.js**：用户 CRUD、密码校验、最后登录 IP/时间、禁用状态。
- **logService.js**：按页与条件查询 admin_login_logs / user_login_logs。
- **rechargeService.js**：充值记录创建与分页列表。

### `src/utils/`

- **rsa.js**：RSA 密钥对生成/加载、公钥 PEM 输出、解密 `passwordEncrypted`。
- **logger.js**：Winston 的 admin-login / user-login 按日轮转日志，以及按 `LOG_RETENTION_DAYS` 清理旧文件的逻辑。

### `src/db/`

- **schema.sql**：所有表 DDL，由 `npm run db:init` 执行。

---

## 数据库表关系

- **admins**：管理员账号（用户名、密码哈希、手机号、创建/最后登录时间）。
- **users**：用户账号（手机号、密码哈希、登录 IP、最后登录时间、会员类型、到期时间、状态）。
- **recharge_records**：充值记录，`user_id` 外键关联 `users.id`，冗余 `username`（如手机号）。
- **admin_login_logs**：管理员登录流水（成功/失败、IP、时间）。
- **user_login_logs**：用户登录流水（成功/失败、IP、时间）。

登录行为同时写入对应 Winston 文件和上述日志表；列表接口只查数据库。

---

## 认证与安全

1. **RSA**：密码在传输层加密，服务端解密后仅用于校验或生成 bcrypt 哈希存储，不以明文落库或写日志。
2. **JWT**：登录成功后签发，payload 含 `id`、`role`（`admin` / `user`）、`username` 或 `phone`；需鉴权的接口通过 `Authorization: Bearer <token>` 校验。
3. **权限**：管理员可访问所有管理接口；用户仅可访问自己的改密、自己的充值记录列表等；禁用用户无法登录。

---

## 接口文档流程

1. 在 `src/routes/*.js` 中通过 JSDoc `@openapi` 定义接口，或修改 `src/config/swagger.js` 的 definition。
2. Swagger UI（`/api-docs`）通过 swagger-jsdoc 实时读取上述定义。
3. 执行 `npm run docs:api-md` 会先由 swagger-jsdoc 生成完整 OpenAPI 规范（并写入 `docs/openapi.json`），再经 openapi-to-md 生成根目录 `api.md`，供其他客户端对齐接口。

修改接口后需同步更新 JSDoc 并重新运行 `npm run docs:api-md`，详见 `.cursor/rules/api-docs-sync.mdc` 与 [开发指南](DEVELOPMENT.md)。
