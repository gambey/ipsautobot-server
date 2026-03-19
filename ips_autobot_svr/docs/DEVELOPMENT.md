# 开发指南

本文档说明如何在本地开发 ips_autobot_svr、如何维护接口文档以及常见调试方式。

---

## 本地开发环境

### 1. 克隆与安装

```bash
cd ips_autobot_svr
npm install
```

### 2. 启动依赖服务

```bash
docker-compose up -d
npm run db:init
```

### 3. 环境变量

复制 `.env.example` 为 `.env`，本地开发一般无需改数据库配置；生产务必修改 `JWT_SECRET` 和 `DB_PASSWORD`。

### 4. 启动开发服务

```bash
npm run dev
```

使用 nodemon，修改 `src/` 下代码会自动重启服务。

---

## 接口文档同步规则（重要）

项目约定：**api.md 与 Swagger 均来自同一套 OpenAPI 定义**，不得单独手改 api.md。

### 当你新增、修改或删除接口时

1. **更新 OpenAPI 定义**
   - 在对应路由文件（`src/routes/*.js`）中修改或新增 JSDoc 的 `@openapi` 块，或
   - 在 `src/config/swagger.js` 中修改 `definition`（如 info、servers、components）。
   - 确保路径、方法、请求体/响应体、参数描述完整，以便 Swagger UI 与 api.md 一致。

2. **重新生成 api.md**
   ```bash
   npm run docs:api-md
   ```
   - 会更新 `docs/openapi.json` 和根目录 `api.md`。
   - 将变更后的 `api.md` 一并提交，便于前端/客户端对齐。

3. **不要**
   - 直接编辑 `api.md`（会被下次生成覆盖）。
   - 只改代码不改 JSDoc（会导致文档与实现不一致）。

详见项目规则：`.cursor/rules/api-docs-sync.mdc`。

---

## JSDoc 书写注意

- 路径需与真实路由一致（如 `/api/admin/login`）。
- 请求体中的密码字段统一用 `passwordEncrypted`、`oldPasswordEncrypted`、`newPasswordEncrypted`，并在描述中注明“RSA 加密”。
- 若 summary 或 description 中含有冒号（如 `admin: all`），在 YAML 中易被解析为键值，可改为“admin 可见全部”等表述，或给整段加引号，避免 swagger-jsdoc 解析报错。

---

## 调试建议

1. **看接口是否生效**  
   打开 <http://localhost:3000/api-docs>，在 Swagger UI 中直接调用（需先通过登录接口获取 token，再在 Authorize 中填入 Bearer token）。

2. **看登录与日志**  
   - 管理员/用户登录成功或失败都会写 `logs/admin-login-*.log` 或 `logs/user-login-*.log`，以及 `admin_login_logs` / `user_login_logs` 表。
   - 可查库表或 tail 日志文件确认行为。

3. **RSA 与密码**  
   - 确保客户端使用 `GET /api/public-key` 返回的 PEM 公钥加密，且密文按接口要求放在对应字段（如 `passwordEncrypted`）。
   - 服务端解密失败会返回 400，不会把明文写进日志。

4. **数据库**  
   - 表结构见 `src/db/schema.sql`。
   - 若改动了 schema，需在库中执行相应 SQL 或扩展 `scripts/init-db.js`（注意幂等与已有数据）。

---

## 脚本说明

| 命令 | 说明 |
|------|------|
|`docker-compose up -d --build`|构建docker|docker compose build --build-arg NODE_IMAGE=docker.1ms.run/node:18-alpine
| `npm start` | 生产方式启动：`node src/server.js` |
| `npm run dev` | 开发方式启动：nodemon 监听 `src/` |
| `npm run db:init` | 执行 `src/db/schema.sql` 初始化表 |
| `npm run db:seed` | 创建初始管理员（用户名 admin，密码 admin123），已存在则跳过 |
| `npm run docs:api-md` | 根据当前 OpenAPI 生成 `api.md` 与 `docs/openapi.json` |

---

## 与客户端对接

- 接口清单与请求/响应格式以 **api.md** 和 **Swagger UI** 为准。
- 认证：除登录、获取公钥、创建用户等公开接口外，其余需在请求头中带 `Authorization: Bearer <JWT>`。
- 密码：所有涉及密码的 body 字段均传 RSA 加密后的字符串（通常为 Base64），不要传明文。
