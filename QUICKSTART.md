# 🚀 快速开始 - CI/CD 部署

## 📦 新增文件

本次配置新增了以下 CI/CD 相关文件:

```
.
├── .dockerignore                    # Docker 构建排除文件
├── .github/
│   └── workflows/
│       └── ci-cd.yml               # GitHub Actions 工作流
├── Dockerfile                       # Docker 镜像构建文件
├── nginx.conf                       # Nginx 配置文件
├── docker-compose.yml               # Docker Compose 编排文件
├── deploy.sh                        # 快速部署脚本
└── DEPLOYMENT.md                    # 详细部署文档
```

---

## ⚡️ 三步部署

### 步骤 1: 推送代码到 GitHub

```bash
# 添加所有新文件
git add .

# 提交
git commit -m "chore: add CI/CD configuration"

# 推送到 main 分支
git push origin main
```

### 步骤 2: 配置 GitHub Actions 权限

1. 访问 `https://github.com/vickko/devops-frontend/settings/actions`
2. Workflow permissions 设置为 **"Read and write permissions"**
3. 勾选 **"Allow GitHub Actions to create and approve pull requests"**

### 步骤 3: 服务器部署

**方式 A: 使用快速部署脚本 (推荐)**

```bash
# SSH 登录服务器
ssh your-server

# 下载并运行部署脚本
curl -fsSL https://raw.githubusercontent.com/vickko/devops-frontend/main/deploy.sh | bash
```

**方式 B: 手动部署**

```bash
# SSH 登录服务器
ssh your-server

# 创建项目目录
mkdir -p ~/devops-frontend && cd ~/devops-frontend

# 下载 docker-compose.yml
wget https://raw.githubusercontent.com/vickko/devops-frontend/main/docker-compose.yml

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

---

## 🎯 验证部署

### 1. 验证 GitHub Actions

访问 `https://github.com/vickko/devops-frontend/actions` 查看构建状态。

预期结果:
- ✅ Lint & Type Check (通过)
- ✅ Build and Push Docker Image (通过)
- ✅ Security Scan (通过)

### 2. 验证镜像推送

访问 `https://github.com/vickko?tab=packages` 查看镜像。

预期结果:
- ✅ 看到 `devops-frontend` 包
- ✅ 标签为 `latest`, `main-<sha>`

### 3. 验证服务运行

```bash
# 健康检查
curl http://localhost:52539/health
# 预期输出: healthy

# 访问应用 (浏览器)
http://YOUR_SERVER_IP:52539
```

---

## 📝 日常开发流程

### 开发 → 部署 (自动化)

```bash
# 1. 本地开发
npm run dev

# 2. 测试构建
npm run build

# 3. 代码检查
npm run lint
npm run type-check

# 4. 提交并推送
git add .
git commit -m "feat: add new feature"
git push origin main

# 5. 等待 5-10 分钟
# ✅ GitHub Actions 自动构建镜像
# ✅ 推送到 GHCR
# ✅ Watchtower 自动部署
```

### 查看部署状态

```bash
# SSH 到服务器
ssh your-server

# 查看服务状态
cd ~/devops-frontend
docker compose ps

# 查看应用日志
docker compose logs -f devops-frontend

# 查看 Watchtower 日志 (自动更新记录)
docker compose logs -f watchtower
```

---

## 🔧 常用命令

### 服务器操作

```bash
# 重启服务
docker compose restart devops-frontend

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 查看资源使用
docker stats devops-frontend

# 手动更新
docker compose pull
docker compose up -d
```

### 本地测试

```bash
# 本地构建镜像
docker build -t devops-frontend:test .

# 本地运行测试
docker run -d -p 8080:8080 --name test devops-frontend:test

# 访问测试
curl http://localhost:8080/health

# 清理
docker stop test && docker rm test
```

---

## 🎨 架构说明

### 工作流程

```
┌─────────────┐
│  开发者本地  │
│  git push   │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│  GitHub Actions     │
│  ├─ 运行测试        │
│  ├─ 构建镜像        │
│  ├─ 推送到 GHCR     │
│  └─ 安全扫描        │
└─────────┬───────────┘
          │
          ↓
┌─────────────────────┐
│  GHCR (镜像仓库)    │
│  ghcr.io/vickko/    │
│  devops-frontend    │
└─────────┬───────────┘
          │
          ↓
┌─────────────────────┐
│  生产服务器         │
│  Watchtower         │
│  ├─ 监控镜像更新    │
│  ├─ 自动拉取        │
│  └─ 滚动重启        │
└─────────────────────┘
```

### 技术栈

- **前端**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **Web 服务器**: Nginx (Alpine Linux)
- **容器化**: Docker (多阶段构建)
- **CI**: GitHub Actions
- **CD**: Watchtower (自动更新)
- **镜像仓库**: GitHub Container Registry (GHCR)

---

## 🔒 安全特性

- ✅ 非 root 用户运行容器 (nginx 用户)
- ✅ 最小化基础镜像 (Alpine Linux)
- ✅ 安全扫描 (Trivy)
- ✅ 多阶段构建 (减少攻击面)
- ✅ Nginx 安全头配置
- ✅ 健康检查 (自动重启)

---

## 📊 性能指标

| 指标 | 值 |
|------|---|
| 镜像大小 | ~50MB |
| 构建时间 | 3-5 分钟 |
| 部署时间 | 2-5 分钟 |
| 总计 (推送→上线) | ~10 分钟 |

---

## 🐛 故障排查

### 问题: 容器启动失败

```bash
# 查看详细日志
docker compose logs devops-frontend

# 检查配置
docker compose config

# 重新创建
docker compose down
docker compose up -d
```

### 问题: 访问不了应用

```bash
# 检查端口
sudo netstat -tlnp | grep 52539

# 检查防火墙
sudo ufw status
sudo ufw allow 52539/tcp

# 检查容器状态
docker compose ps
```

### 问题: Watchtower 没更新

```bash
# 查看 Watchtower 日志
docker compose logs watchtower

# 手动触发更新
docker exec watchtower /watchtower --run-once
```

---

## 📖 更多文档

详细配置和高级用法请参考:

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 完整部署文档
- [README.md](./README.md) - 项目说明
- [GitHub Actions 文档](https://docs.github.com/actions)
- [Docker 文档](https://docs.docker.com/)

---

## 💡 提示

1. **首次部署**: 需要配置 GitHub Actions 权限
2. **私有仓库**: 需要在服务器登录 GHCR
3. **自动更新**: Watchtower 每 5 分钟检查一次
4. **零停机**: 使用滚动更新策略
5. **日志管理**: 自动轮转,最多保留 30MB

---

## 🎉 完成!

现在你已经拥有一个完全自动化的 CI/CD 流程:

1. ✅ 本地开发
2. ✅ git push
3. ✅ 自动构建
4. ✅ 自动部署
5. ✅ 自动更新

享受零配置、自愈的部署体验! 🚀
