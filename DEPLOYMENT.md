# DevOps Frontend - CI/CD 部署文档

## 📋 目录

- [架构概览](#架构概览)
- [快速开始](#快速开始)
- [详细部署](#详细部署)
- [日常使用](#日常使用)
- [故障排查](#故障排查)
- [配置说明](#配置说明)

---

## 🏗️ 架构概览

### 技术栈

- **前端框架**: Vue 3 + TypeScript + Vite
- **UI**: Tailwind CSS
- **容器**: Docker + Nginx
- **CI/CD**: GitHub Actions + Watchtower
- **镜像仓库**: GitHub Container Registry (GHCR)

### 工作流程

```
开发者 → git push → GitHub Actions → GHCR → Watchtower → 生产服务器
  ↓                      ↓             ↓          ↓
 代码               构建+推送        存储     自动部署
```

---

## 🚀 快速开始

### 1. 本地测试构建

```bash
# 构建 Docker 镜像
docker build -t devops-frontend:test .

# 运行容器测试
docker run -d -p 8080:8080 --name frontend-test devops-frontend:test

# 访问测试
curl http://localhost:8080/health

# 清理
docker stop frontend-test && docker rm frontend-test
```

### 2. 服务器首次部署

```bash
# SSH 登录服务器
ssh your-server

# 创建项目目录
mkdir -p ~/devops-frontend
cd ~/devops-frontend

# 下载 docker-compose.yml
wget https://raw.githubusercontent.com/vickko/devops-frontend/main/docker-compose.yml

# 启动服务 (会自动拉取镜像)
docker compose up -d

# 查看日志
docker compose logs -f
```

### 3. 开发推送

```bash
# 本地开发完成后
git add .
git commit -m "feat: your feature"
git push origin main

# 等待 5-10 分钟
# GitHub Actions 自动构建 → GHCR → Watchtower 自动部署
```

---

## 📦 详细部署

### 前置要求

**服务器环境**:
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Docker 24.0+
- Docker Compose 2.0+
- 至少 1GB RAM
- 至少 5GB 磁盘空间

**GitHub 配置**:
- 仓库权限: 读写权限
- Packages 权限: 已启用
- Actions 权限: 已启用

### 步骤 1: 配置 GitHub Repository

#### 1.1 启用 GitHub Packages

1. 进入仓库 Settings → Actions → General
2. Workflow permissions 设置为 "Read and write permissions"
3. 勾选 "Allow GitHub Actions to create and approve pull requests"

#### 1.2 配置镜像权限 (可选 - 私有镜像)

```bash
# 生成 Personal Access Token (PAT)
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# 权限: read:packages, write:packages, delete:packages

# 在服务器上登录 GHCR
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# 输入生成的 PAT
```

### 步骤 2: 推送代码触发构建

```bash
# 确保所有 CI/CD 文件都在仓库中
git add Dockerfile .dockerignore nginx.conf docker-compose.yml .github/
git commit -m "chore: add CI/CD configuration"
git push origin main
```

### 步骤 3: 验证 GitHub Actions

1. 访问 `https://github.com/vickko/devops-frontend/actions`
2. 查看 "CI/CD Pipeline" 运行状态
3. 等待所有 Job 完成 (约 3-5 分钟)

### 步骤 4: 服务器部署

#### 4.1 安装 Docker (如果未安装)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### 4.2 部署应用

```bash
# 创建项目目录
mkdir -p ~/devops-frontend
cd ~/devops-frontend

# 下载 docker-compose.yml
wget https://raw.githubusercontent.com/vickko/devops-frontend/main/docker-compose.yml

# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f devops-frontend
docker compose logs -f watchtower
```

#### 4.3 验证部署

```bash
# 健康检查
curl http://localhost:52539/health

# 访问应用 (在浏览器)
http://YOUR_SERVER_IP:52539
```

### 步骤 5: 配置防火墙 (可选)

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 52539/tcp
sudo ufw reload

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=52539/tcp
sudo firewall-cmd --reload
```

---

## 💻 日常使用

### 开发流程

```bash
# 1. 本地开发
npm run dev

# 2. 测试
npm run lint
npm run type-check
npm run build

# 3. 提交代码
git add .
git commit -m "feat: add new feature"
git push origin main

# 4. 自动部署
# 等待 5-10 分钟,GitHub Actions + Watchtower 自动完成
```

### 常用命令

#### 查看服务状态

```bash
# 查看所有服务
docker compose ps

# 查看详细状态
docker compose ps -a

# 查看资源使用
docker stats devops-frontend
```

#### 查看日志

```bash
# 实时日志
docker compose logs -f devops-frontend

# 最近 100 行
docker compose logs --tail=100 devops-frontend

# 所有服务日志
docker compose logs -f

# Watchtower 日志 (查看更新记录)
docker compose logs -f watchtower
```

#### 重启服务

```bash
# 重启前端服务
docker compose restart devops-frontend

# 重启所有服务
docker compose restart

# 停止服务
docker compose stop

# 启动服务
docker compose start
```

#### 更新镜像

```bash
# 手动拉取最新镜像
docker compose pull

# 重启服务应用新镜像
docker compose up -d

# 查看镜像版本
docker images | grep devops-frontend
```

#### 清理资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理所有未使用资源
docker system prune -a --volumes

# 查看磁盘使用
docker system df
```

### 手动触发 Watchtower 更新

```bash
# 立即检查更新
docker exec watchtower /watchtower --run-once

# 强制更新特定容器
docker exec watchtower /watchtower --run-once devops-frontend
```

---

## 🔧 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker compose logs devops-frontend

# 检查配置文件
docker compose config

# 检查端口占用
sudo netstat -tlnp | grep 52539

# 重新创建容器
docker compose down
docker compose up -d
```

### 问题 2: Watchtower 没有自动更新

```bash
# 检查 Watchtower 日志
docker compose logs watchtower

# 验证镜像更新
docker pull ghcr.io/vickko/devops-frontend:latest

# 对比镜像 digest
docker images --digests | grep devops-frontend

# 手动触发更新
docker exec watchtower /watchtower --run-once
```

### 问题 3: GitHub Actions 构建失败

**检查清单**:
1. 查看 Actions 日志: `https://github.com/vickko/devops-frontend/actions`
2. 验证 Workflow 权限: Settings → Actions → General
3. 检查 package.json 脚本是否正确
4. 验证 Dockerfile 语法

**常见错误**:

```bash
# 依赖安装失败
npm ci --legacy-peer-deps

# 构建失败
npm run build

# 类型检查失败
npm run type-check
```

### 问题 4: 镜像拉取失败 (私有仓库)

```bash
# 重新登录 GHCR
docker logout ghcr.io
docker login ghcr.io -u YOUR_GITHUB_USERNAME

# 验证凭证
cat ~/.docker/config.json

# 手动拉取测试
docker pull ghcr.io/vickko/devops-frontend:latest
```

### 问题 5: 页面 404 错误 (SPA 路由)

检查 nginx.conf 配置:

```nginx
# 确保有 SPA 路由支持
location / {
    try_files $uri $uri/ /index.html;
}
```

### 问题 6: 健康检查失败

```bash
# 进入容器检查
docker exec -it devops-frontend sh

# 手动测试健康检查
curl http://localhost:8080/health

# 查看 Nginx 状态
ps aux | grep nginx

# 查看 Nginx 错误日志
cat /var/log/nginx/error.log
```

---

## ⚙️ 配置说明

### 环境变量

docker-compose.yml 中可配置的环境变量:

```yaml
environment:
  - NODE_ENV=production        # 生产环境
  - TZ=Asia/Shanghai          # 时区
```

### 端口配置

修改 docker-compose.yml 中的端口映射:

```yaml
ports:
  - "52539:8080"  # 主机端口:容器端口
```

### Watchtower 配置

docker-compose.yml 中 Watchtower 环境变量:

```yaml
environment:
  - WATCHTOWER_POLL_INTERVAL=300      # 检查间隔 (秒)
  - WATCHTOWER_CLEANUP=true           # 自动清理旧镜像
  - WATCHTOWER_LOG_LEVEL=info         # 日志级别
```

### Nginx 配置

修改 nginx.conf 自定义 Nginx 行为:

- 缓存策略
- Gzip 压缩
- 安全头
- 反向代理 (API)

**示例: 添加 API 代理**

```nginx
location /api/ {
    proxy_pass http://backend-host:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### GitHub Actions 配置

修改 .github/workflows/ci-cd.yml:

- 触发分支
- 构建平台
- 缓存策略
- 安全扫描

---

## 📊 监控和维护

### 日志管理

日志配置 (docker-compose.yml):

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # 单个日志文件最大 10MB
    max-file: "3"      # 保留 3 个日志文件
```

### 资源监控

```bash
# 实时监控
docker stats devops-frontend

# 查看磁盘使用
docker system df

# 查看容器资源限制
docker inspect devops-frontend | grep -A 10 "Memory"
```

### 定期维护

**每周**:
```bash
# 检查服务状态
docker compose ps

# 查看日志
docker compose logs --tail=100 devops-frontend
```

**每月**:
```bash
# 清理未使用镜像
docker image prune -a

# 检查磁盘空间
df -h
docker system df
```

---

## 🔒 安全建议

1. **使用 HTTPS**: 配置 Nginx SSL 证书 (Let's Encrypt)
2. **限制网络访问**: 使用防火墙限制端口访问
3. **定期更新**: 保持 Docker 和镜像最新
4. **最小权限**: 容器使用非 root 用户运行
5. **安全扫描**: GitHub Actions 集成 Trivy 扫描
6. **日志审计**: 定期检查访问日志

---

## 📈 性能优化

### 构建优化

- ✅ npm ci 代替 npm install (更快更可靠)
- ✅ 多阶段构建 (减小镜像体积)
- ✅ Docker 层缓存 (加速构建)
- ✅ .dockerignore (排除无关文件)

### 运行时优化

- ✅ Gzip 压缩 (减少传输大小)
- ✅ 静态资源缓存 (加速加载)
- ✅ Nginx 性能调优 (worker_processes)
- ✅ 健康检查 (快速发现问题)

### 部署优化

- ✅ Watchtower 滚动更新 (零停机)
- ✅ 健康检查 (自动重启)
- ✅ 资源限制 (防止资源耗尽)

---

## 🎯 下一步

可选的增强方向:

1. **HTTPS 支持**: 配置 SSL 证书
2. **反向代理**: 集成 Nginx Proxy Manager
3. **监控告警**: 集成 Prometheus + Grafana
4. **日志收集**: 集成 ELK Stack
5. **多环境**: 配置 staging 环境
6. **蓝绿部署**: 多实例负载均衡

---

## 📞 联系支持

- **Issues**: https://github.com/vickko/devops-frontend/issues
- **Discussions**: https://github.com/vickko/devops-frontend/discussions

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-15
**维护者**: DevOps Team
