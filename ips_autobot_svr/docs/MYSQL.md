# 进入 MySQL 控制台

本文档说明如何在开发机或服务器上进入 **MySQL 8** 交互式客户端，对 `ips_autobot` 库执行查询或维护 SQL。

---

## 1. 连接信息（请先对齐）

| 项 | 说明 |
|----|------|
| 数据库名 | `ips_autobot`（Compose 创建库名，见 `docker-compose.yml`） |
| 用户 | 一般为 **`root`**（本项目脚本与示例均使用 root） |
| 密码 | 来自环境变量 **`MYSQL_ROOT_PASSWORD`**；未设置时默认与仓库示例一致（见 `.env.example` / `docker-compose.yml` 中的默认值） |
| 容器名 | **`ips_autobot_mysql`**（`docker-compose.yml` 中 `container_name`） |

> **安全提示**：不要在聊天、工单、截图中泄露生产环境密码。命令行里使用 `-p` **不带密码**、回车后在提示符下输入，可避免密码留在 shell 历史中。

---

## 2. 方式 A：进入容器内用 `mysql` 客户端（推荐）

适用于：**本机 Docker Compose**、**生产环境未对宿主机映射 3306/3308**（只能进容器连库）。

### 2.1 确认容器在运行

在项目目录（含 `docker-compose.yml`）执行：

```bash
docker ps --filter name=ips_autobot_mysql
```

应能看到 `STATUS` 为 `Up` 且 `NAMES` 为 `ips_autobot_mysql`。

### 2.2 进入交互式 MySQL（会提示输入密码）

**若使用 `docker compose`（推荐）：**

```bash
cd /path/to/ips_autobot_svr
docker compose exec mysql mysql -uroot -p
```

**若使用旧写法 `docker-compose`：**

```bash
docker-compose exec mysql mysql -uroot -p
```

**若已知容器名，可直接：**

```bash
docker exec -it ips_autobot_mysql mysql -uroot -p
```

出现 `Enter password:` 时，输入 **`MYSQL_ROOT_PASSWORD` 对应的值**（与 `.env` 或 compose 里一致），回车。

成功后会看到 `mysql>` 提示符。

### 2.3 生产叠加 `docker-compose.prod.yml` 时

数据库端口可能未映射到宿主机，**仍可用方式 A**（进入 `mysql` 服务容器）：

```bash
cd /path/to/ips_autobot_svr
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec mysql mysql -uroot -p
```

---

## 3. 方式 B：在宿主机用客户端连接（仅当映射了端口）

默认 **`docker-compose.yml` 将容器 `3306` 映射到宿主机 `3308`**，因此在**宿主机**（未进容器）可用：

```bash
mysql -h 127.0.0.1 -P 3308 -uroot -p
```

同样交互式输入密码。

**说明：**

- 若 Node 在**宿主机**运行（`npm run dev`）且连本机上的 MySQL 容器，`.env` 中一般为 `DB_HOST=localhost`、`**DB_PORT=3308**`（与映射一致）。
- 若 Node 在 **app 容器内**运行，应使用 `DB_HOST=mysql`、`**DB_PORT=3306**`（容器网络内直连 MySQL 服务名与内部端口）。

**Windows**：若未安装 `mysql` 命令行客户端，可安装 [MySQL Shell](https://dev.mysql.com/downloads/mysql/) 或 **直接使用方式 A**（本机已装 Docker 即可）。

---

## 4. 进入 `mysql>` 后的常用命令

```sql
-- 查看库
SHOW DATABASES;

-- 使用业务库
USE ips_autobot;

-- 查看表
SHOW TABLES;

-- 查看某表结构（示例：管理员表）
DESCRIBE admins;

-- 退出客户端
EXIT;
```

（`EXIT` 与 `QUIT` 等价。）

---

## 5. 一行执行 SQL（非交互，适合脚本）

在容器内执行单条语句（将 `YOUR_PASSWORD` 换为真实密码时注意安全，更推荐交互式 `-p`）：

```bash
docker compose exec mysql mysql -uroot -pYOUR_PASSWORD -e "SHOW DATABASES;"
```

或使用 `docker exec`：

```bash
docker exec ips_autobot_mysql mysql -uroot -pYOUR_PASSWORD -e "USE ips_autobot; SHOW TABLES;"
```

生产环境更安全的做法是：**交互登录后手工执行**，或使用已保存的凭据文件、密钥管理，**避免把密码写在命令行历史里**。

---

## 6. 常见问题

| 现象 | 处理方向 |
|------|----------|
| `Access denied for user 'root'` | 核对 `MYSQL_ROOT_PASSWORD` 与当前使用的密码是否一致；是否连错端口（宿主机应为 `3308`）。 |
| `Can't connect to MySQL server` | 容器是否启动；防火墙是否放行；宿主机连接时是否使用了 `-h 127.0.0.1 -P 3308`。 |
| 生产环境无法从外网直连数据库 | 预期行为：`docker-compose.prod.yml` 通常不暴露 MySQL 端口，请用 **方式 A** 在服务器上进入容器。 |

---

## 7. 与备份文档的关系

使用 `mysqldump` / `mysql` 做全库备份与恢复时，命令示例见 **`docs/DEPLOYMENT.md`** 中「备份与恢复」章节；本文侧重 **交互式进入 `mysql` 客户端** 的步骤。
