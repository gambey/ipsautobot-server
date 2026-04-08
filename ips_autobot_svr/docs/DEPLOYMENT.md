# 部署文档（Docker）

本文档用于在单机环境通过 Docker Compose 部署 `ips_autobot_svr`。

## 1. 前置条件

- Docker 24+
- Docker Compose v2
- 开放端口：`3000`（应用）、`3306`（数据库，可按需仅内网）

## 2. 环境变量

在项目根目录创建 `.env`（至少建议设置以下项）：

```env
JWT_SECRET=please-change-this-to-a-strong-secret
```

> `docker-compose.yml` 已配置应用容器到数据库容器的连接参数（`DB_HOST=mysql`）。

## 2.1 本地打包命令（可选）

若不通过 Git 拉代码，可在本地打包后上传服务器部署。

Linux/macOS（在项目父目录执行）：

```bash
tar --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='.env' -czf ips_autobot_svr.tar.gz ips_autobot_svr
```

Windows PowerShell（在项目目录执行）：

```powershell
Compress-Archive -Path .\* -DestinationPath .\ips_autobot_svr.zip -Force
```

上传到服务器并进入部署路径（示例：`/opt`）：

```bash
scp ips_autobot_svr.tar.gz <user>@<server-ip>:/opt/
ssh <user>@<server-ip>
cd /opt
```

解压命令：

```bash
# tar.gz 包
tar -xzf ips_autobot_svr.tar.gz
cd ips_autobot_svr

# zip 包
unzip -o ips_autobot_svr.zip -d ips_autobot_svr
cd ips_autobot_svr
```

## 3. 首次部署

在项目根目录执行：

```bash
docker-compose up -d --build
```

等待容器健康后，初始化数据库并创建初始管理员：

```bash
docker compose exec app node scripts/init-db.js
docker compose exec app node scripts/seed-admin.js
```

访问地址：

- 应用：`http://localhost:3000`
- Swagger：`http://localhost:3000/api-docs`
- 健康检查：`http://localhost:3000/health`

初始管理员：

- 用户名：`admin`
- 密码：`admin123`（首次登录后请立即修改）

## 4. 日常运维

启动：

```bash
docker-compose up -d
```

停止：

```bash
docker-compose down
```

重启：

```bash
docker-compose restart
```

查看日志：

```bash
docker compose logs -f app
docker compose logs -f mysql
```

### 更新客户端配置包（`client_settings.zip` / `client_settings_yifei.zip`，无需重建镜像）

`docker-compose.yml` 已将项目根目录下两个文件只读挂载到容器内：

- `./client_settings.zip` -> `/app/client_settings.zip`
- `./client_settings_yifei.zip` -> `/app/client_settings_yifei.zip`

因此更新配置包后通常**不必**执行 `docker compose build`。

**首次部署：** 两个 zip 文件都建议先放到项目目录（可先放占位文件）再 `up`，避免单文件 bind mount 异常。

#### 标准更新步骤（推荐）

```bash
cd /opt/ips_autobot_svr
# 1) 覆盖智灵包
cp /path/to/new/client_settings.zip ./client_settings.zip
# 2) 覆盖翼飞包
cp /path/to/new/client_settings_yifei.zip ./client_settings_yifei.zip
# 3) 重新创建 app 容器，确保单文件挂载绑定到最新 inode
docker compose up -d --force-recreate app
```

> 将 `/opt/ips_autobot_svr` 和 `/path/to/new/...` 替换为你的实际路径。

#### 为什么建议 `--force-recreate`

Linux 对**单文件** bind mount 时，如果上传工具（例如宝塔“上传覆盖”）采用“删除再创建同名文件”的方式，会生成新的 inode，容器仍可能读取旧 inode 对应内容。`--force-recreate app` 可一次性消除此问题。

#### 更新后校验（建议执行）

```bash
cd /opt/ips_autobot_svr
sha256sum ./client_settings.zip ./client_settings_yifei.zip
docker exec ips_autobot_svr sha256sum /app/client_settings.zip /app/client_settings_yifei.zip
```

两侧哈希一致即表示容器已读取最新文件。

#### 接口连通性校验（可选）

```bash
curl -i -H "Authorization: Bearer <USER_JWT>" http://127.0.0.1:3002/api/client-settings.zip
curl -i -H "Authorization: Bearer <USER_JWT>" http://127.0.0.1:3002/api/client-settings-yifei.zip
```

## 5. 升级发布

拉取新代码后执行：

```bash
docker-compose up -d --build
```

若涉及数据库字段变更，按需执行迁移脚本，例如：

```bash
# users.username 字段迁移（历史版本兼容）
docker compose exec app node scripts/migrate-add-user-username.js
# users.mac_addr + 唯一索引
docker compose exec app npm run db:migrate-user-mac
# users.score + score_record
docker compose exec app npm run db:migrate-user-score
# users 30d/90d/180d/365d 积分档位字段
docker compose exec app npm run db:migrate-user-score-tiers
# admins.admin_type（0=超级管理员,1=普通管理员）
docker compose exec app npm run db:migrate-admin-type
# 智灵/翼飞多客户端：用户列拆分、充值表、score_record.client_app（破坏性，先备份）
docker compose exec app npm run db:migrate-multi-app
```

## 6. 回滚

回退到指定版本代码后重新构建：

```bash
git checkout <previous_commit>
docker-compose up -d --build
```

## 7. 备份与恢复

备份数据库：

```bash
docker exec ips_autobot_mysql sh -c "mysqldump -uroot -pgR7iKWTvQLLqhhwn ips_autobot" > backup.sql
```

恢复数据库：

```bash
docker exec -i ips_autobot_mysql sh -c "mysql -uroot -pgR7iKWTvQLLqhhwn ips_autobot" < backup.sql
```

### 进入 MySQL 交互式控制台

排查数据、手工执行 SQL（如维护 `admins` 等）时，需要登录 `mysql` 客户端。完整步骤与命令（`docker compose exec mysql …`、宿主机 `3308`、生产未映射端口等）见 **[MYSQL.md](./MYSQL.md)**。

## 8. 常见问题

1. 拉取镜像超时或校验失败：
  - 配置 Docker 镜像加速；
  - 执行 `docker builder prune -f` 后重试；
  - 本项目 Dockerfile 已默认使用镜像源 `docker.1ms.run/node:18-alpine`。
2. Swagger 未更新：
  - 路由 JSDoc 修改后，重新构建并启动：`docker-compose up -d --build`；
  - 再刷新 `http://localhost:3000/api-docs`。
3. CORS 报错：
  - 确认应用已用新镜像重建；
  - 按需设置 `CORS_ORIGIN` 并重启容器。

## 9. 安全建议

- 生产环境必须设置强 `JWT_SECRET`；
- 首次部署后立即修改默认管理员密码；
- 如无需宿主机直连数据库，建议去掉 MySQL 对外端口映射；
- 建议前置 Nginx/Caddy 并启用 HTTPS。

## 10. 生产环境部署步骤（推荐）

以下为单机生产环境的推荐流程（Docker Compose + 反向代理 + HTTPS）。

### 步骤 1：准备生产服务器

- 建议系统：Ubuntu 22.04 LTS / Debian 12
- 安装 Docker 与 Docker Compose
- 建议仅开放端口：`80`、`443`（`3000`、`3306` 仅内网或不开放）

### 步骤 2：准备代码与环境变量

```bash
git clone <your_repo_url> ips_autobot_svr
cd ips_autobot_svr
```

若你不通过 Git 拉代码，也可以在本地先打包后上传服务器。

本地打包（排除 `node_modules`、`.git`、日志与环境文件）：

Linux/macOS（在项目父目录执行）：

```bash
tar --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='.env' -czf ips_autobot_svr.tar.gz ips_autobot_svr
```

Windows PowerShell（在项目目录执行）：

```powershell
Compress-Archive -Path .\* -DestinationPath .\ips_autobot_svr.zip -Force
```

上传并解压（服务器）：

```bash
scp ips_autobot_svr.tar.gz <user>@<server-ip>:/opt/
ssh <user>@<server-ip>
cd /opt && tar -xzf ips_autobot_svr.tar.gz && cd ips_autobot_svr
```

若你使用的是 PowerShell 生成的 zip 包，上传后在服务器解压：

```bash
scp ips_autobot_svr.zip <user>@<server-ip>:/opt/
ssh <user>@<server-ip>
cd /opt && unzip -o ips_autobot_svr.zip -d ips_autobot_svr && cd ips_autobot_svr
```

创建生产环境变量文件（至少包含）：

```env
JWT_SECRET=<strong-random-secret>
```

建议额外配置（按需）：

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

### 步骤 3：使用生产配置（不暴露数据库端口）

仓库已提供 **`docker-compose.prod.yml`**（与根目录 `docker-compose.yml` 叠加使用）。

在服务器将 **`.env.production.example` 复制为 `.env`**，填写 `JWT_SECRET`、`MYSQL_ROOT_PASSWORD`（与数据库 root 密码一致）及可选 `CORS_ORIGIN`。

说明：

- `mysql.ports: []` 表示不暴露数据库到宿主机公网。
- `app` 仅绑定本机回环地址，外部访问通过反向代理转发。
- Nginx 示例见 `deploy/nginx/ips_autobot_svr.conf.sample`。

### 步骤 4：首次生产启动

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

初始化数据库与管理员（建议使用 `-T`，避免无 TTY 环境卡住）：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app node scripts/init-db.js
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app node scripts/seed-admin.js
```

### 步骤 5：配置反向代理（Nginx）

可复制仓库内示例并按域名修改：

```bash
sudo cp deploy/nginx/ips_autobot_svr.conf.sample /etc/nginx/sites-available/ips_autobot_svr.conf
sudo nano /etc/nginx/sites-available/ips_autobot_svr.conf
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/ips_autobot_svr.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 6：启用 HTTPS（Let's Encrypt）

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

证书自动续期检查：

```bash
sudo certbot renew --dry-run
```

### 步骤 7：生产升级发布

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

若有数据结构变更，执行迁移脚本（按版本说明）：

```bash
# users.username 字段迁移（历史版本兼容）
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app node scripts/migrate-add-user-username.js
# users.mac_addr + 唯一索引
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app npm run db:migrate-user-mac
# users.score + score_record
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app npm run db:migrate-user-score
# users 30d/90d/180d/365d 积分档位字段
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app npm run db:migrate-user-score-tiers
# admins.admin_type（0=超级管理员,1=普通管理员）
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app npm run db:migrate-admin-type
# 智灵/翼飞多客户端（先备份）
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app npm run db:migrate-multi-app
```

### 步骤 8：生产回滚

```bash
git checkout <stable_commit_or_tag>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 步骤 9：生产验收清单

- `https://api.your-domain.com/health` 返回 `{"ok":true}`
- Swagger 页面可访问：`https://api.your-domain.com/api-docs`
- 已修改默认管理员密码
- `JWT_SECRET` 已设置为高强度随机字符串
- 数据库端口未对公网开放

