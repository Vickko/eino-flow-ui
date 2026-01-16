# ================================
# Stage 1: Builder
# ================================
FROM node:22.12.0-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖 (如果需要)
RUN apk add --no-cache git

# 复制 package 文件
COPY package*.json ./

# 安装依赖 (使用 npm ci 确保锁文件一致性)
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 定义构建参数（可在构建时通过 --build-arg 传递）
ARG VITE_API_BASE_URL=/api
ARG VITE_ENABLE_AUTH=true

# 设置环境变量供 Vite 构建时使用
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ENABLE_AUTH=${VITE_ENABLE_AUTH}

# 构建生产版本
RUN npm run build

# ================================
# Stage 2: Runtime (Nginx)
# ================================
FROM nginx:1.27-alpine

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建非 root 用户运行 Nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 切换到非 root 用户
USER nginx

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
