#!/bin/bash
set -e

echo "=== AgentHub 项目初始化与验证 ==="
echo

# 检查 Node.js 和 pnpm
echo "=== 检查环境依赖 ==="
node -v || echo "Node.js 未安装"
pnpm -v || echo "pnpm 未安装"
echo

# 检查环境变量
echo "=== 检查环境变量 ==="
if [ -f ".env" ]; then
  echo ".env 文件已存在"
else
  echo "警告: .env 文件不存在，请从 .env.example 创建"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "已从 .env.example 创建 .env 文件"
  fi
fi
echo

# 初始化 gateway 项目
echo "=== 初始化 Gateway 项目 ==="
cd agenthub-gateway

echo "安装依赖..."
pnpm install

echo "运行类型检查..."
pnpm run typecheck

echo "运行测试..."
pnpm run test

# 初始化数据库
echo "初始化数据库..."
pnpm run db:generate
echo "数据库初始化完成"

echo "构建 gateway API..."
pnpm run build:gateway

echo "构建 web 前端..."
pnpm run build:web

cd ..
echo

# 初始化 plugin 项目
echo "=== 初始化 Plugin 项目 ==="
cd agenthub-plugin

echo "安装依赖..."
pnpm install

echo "运行类型检查..."
pnpx tsc --noEmit

cd ..
echo

# 验证项目结构
echo "=== 验证项目结构 ==="
for file in feature_list.json; do
  if [ -f "$file" ]; then
    echo "✓ $file 已存在"
  else
    echo "⚠️  $file 不存在"
  fi
done

# 验证进度文档目录
if [ -d "docs/progress/" ]; then
  echo "✓ docs/progress/ 目录已存在"
else
  echo "⚠️  docs/progress/ 目录不存在"
fi
echo

# 验证技能目录
echo "=== 验证技能目录 ==="
if [ -d "docs/skills" ]; then
  echo "✓ docs/skills 目录已存在"
  if [ "$(ls -A docs/skills)" ]; then
    echo "  包含技能: $(ls -la docs/skills)"
  else
    echo "  警告: docs/skills 目录为空"
  fi
else
  echo "⚠️ docs/skills 目录不存在"
fi
echo

echo "=== 初始化与验证完成 ==="
echo "项目已准备就绪，可以开始开发。"
echo "请阅读 AGENTS.md 和 feature_list.json 了解更多信息。"