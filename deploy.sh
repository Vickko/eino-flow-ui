#!/bin/bash

# ================================
# DevOps Frontend 快速部署脚本
# ================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 检查 Docker 是否安装
check_docker() {
    info "检查 Docker 安装..."
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装。请先安装 Docker: https://docs.docker.com/get-docker/"
    fi
    info "✓ Docker 已安装: $(docker --version)"
}

# 检查 Docker Compose 是否安装
check_docker_compose() {
    info "检查 Docker Compose 安装..."
    if ! docker compose version &> /dev/null; then
        error "Docker Compose 未安装。请先安装 Docker Compose。"
    fi
    info "✓ Docker Compose 已安装: $(docker compose version)"
}

# 下载 docker-compose.yml
download_compose_file() {
    info "下载 docker-compose.yml..."
    if [ -f "docker-compose.yml" ]; then
        warn "docker-compose.yml 已存在,备份为 docker-compose.yml.backup"
        mv docker-compose.yml docker-compose.yml.backup
    fi

    curl -fsSL https://raw.githubusercontent.com/vickko/devops-frontend/main/docker-compose.yml -o docker-compose.yml
    if [ $? -eq 0 ]; then
        info "✓ docker-compose.yml 下载成功"
    else
        error "下载 docker-compose.yml 失败"
    fi
}

# 登录 GHCR (可选 - 私有仓库)
login_ghcr() {
    read -p "是否需要登录 GitHub Container Registry? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "GitHub 用户名: " GITHUB_USER
        read -sp "GitHub Personal Access Token: " GITHUB_TOKEN
        echo
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
        if [ $? -eq 0 ]; then
            info "✓ GHCR 登录成功"
        else
            error "GHCR 登录失败"
        fi
    fi
}

# 拉取镜像
pull_images() {
    info "拉取 Docker 镜像..."
    docker compose pull
    if [ $? -eq 0 ]; then
        info "✓ 镜像拉取成功"
    else
        error "镜像拉取失败"
    fi
}

# 启动服务
start_services() {
    info "启动服务..."
    docker compose up -d
    if [ $? -eq 0 ]; then
        info "✓ 服务启动成功"
    else
        error "服务启动失败"
    fi
}

# 检查服务状态
check_services() {
    info "检查服务状态..."
    sleep 5
    docker compose ps

    info "等待服务就绪..."
    sleep 10

    # 健康检查
    if curl -f http://localhost:52539/health &> /dev/null; then
        info "✓ 服务健康检查通过"
    else
        warn "服务健康检查失败,请查看日志: docker compose logs -f"
    fi
}

# 显示访问信息
show_info() {
    echo ""
    echo "=========================================="
    echo "  🎉 部署完成!"
    echo "=========================================="
    echo ""
    echo "访问地址:"
    echo "  http://localhost:52539"
    echo "  http://$(hostname -I | awk '{print $1}'):52539"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker compose logs -f"
    echo "  查看状态: docker compose ps"
    echo "  重启服务: docker compose restart"
    echo "  停止服务: docker compose down"
    echo ""
    echo "Watchtower 已启动,将每 5 分钟自动检查更新。"
    echo ""
}

# 主函数
main() {
    echo "=========================================="
    echo "  DevOps Frontend 快速部署脚本"
    echo "=========================================="
    echo ""

    check_docker
    check_docker_compose
    download_compose_file
    login_ghcr
    pull_images
    start_services
    check_services
    show_info
}

# 运行主函数
main
