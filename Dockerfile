# Process Engineering Fleet Manager - Production Dockerfile

FROM node:18-alpine AS base
WORKDIR /app

# 安装依赖
FROM base AS deps
COPY package.json bun.lockb* ./
RUN npm install -g bun && bun install --frozen-lockfile

# 构建应用
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g bun && bun run build

# 生产镜像
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
