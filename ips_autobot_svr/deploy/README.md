# 生产部署资源

- **`../docker-compose.prod.yml`** — 与根目录 `docker-compose.yml` 叠加使用，关闭 MySQL 公网端口并将应用绑定 `127.0.0.1:3000`。
- **`../.env.production.example`** — 生产环境变量模板；在服务器复制为 `.env` 后填写。
- **`nginx/ips_autobot_svr.conf.sample`** — Nginx 站点配置示例，按需改域名后启用。

完整步骤见 [部署文档](../docs/DEPLOYMENT.md)。
