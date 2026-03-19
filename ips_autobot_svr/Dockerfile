# 默认使用国内镜像源，直接执行 docker-compose up -d --build 即可
# 若本机可直连 Docker Hub，可覆盖：docker compose build --build-arg NODE_IMAGE=node:18-alpine
ARG NODE_IMAGE=docker.1ms.run/node:18-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY docs ./docs
COPY api.md ./

EXPOSE 3000

CMD ["node", "src/server.js"]
