const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ENV_FILE = process.argv[2] || '.env.dev';

console.log('==========================================');
console.log('  AgentHub Gateway — Setup');
console.log('==========================================');

// 1. 环境变量
if (!fs.existsSync('.env')) {
  if (!fs.existsSync(ENV_FILE)) {
    console.error(`[x] 环境文件 ${ENV_FILE} 不存在`);
    process.exit(1);
  }
  fs.copyFileSync(ENV_FILE, '.env');
  console.log(`[1/5] 环境变量: 已从 ${ENV_FILE} 复制到 .env`);
} else {
  console.log('[1/5] 环境变量: .env 已存在，跳过');
}

// 2. 安装依赖
console.log('[2/5] 安装依赖...');
try {
  execSync('pnpm install --frozen-lockfile', { stdio: 'inherit' });
} catch {
  execSync('pnpm install', { stdio: 'inherit' });
}

// 3. Prisma Client
console.log('[3/5] 生成 Prisma Client...');
try {
  execSync('pnpm db:generate', { stdio: 'inherit' });
} catch {
  console.log('  (Prisma Client 可能已存在，跳过)');
}

// 4. 数据库表结构
console.log('[4/5] 同步数据库表结构...');
execSync('pnpm db:push', { stdio: 'inherit' });

// 5. 种子数据
const DB_PATH = './data/agenthub.db';
if (fs.existsSync(DB_PATH)) {
  // Check if agents table has data using a simple prisma query
  console.log('[5/5] 写入种子数据...');
  try {
    execSync('pnpm db:seed', { stdio: 'inherit' });
  } catch {
    console.log('  (种子数据可能已存在，跳过)');
  }
} else {
  console.log('[5/5] 写入种子数据...');
  execSync('pnpm db:seed', { stdio: 'inherit' });
}

console.log('');
console.log('==========================================');
console.log('  Setup 完成！启动方式：');
console.log('    pnpm dev            # Gateway + Web');
console.log('    pnpm dev:gateway    # 仅 Gateway');
console.log('    pnpm dev:web        # 仅 Web');
console.log('==========================================');
