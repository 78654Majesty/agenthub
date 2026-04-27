// 数据库数据查看脚本
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('=== AgentHub 数据库数据查看 ===\n');

  try {
    // 1. 查看管理员账户
    console.log('1. 管理员账户:');
    const admins = await prisma.adminUser.findMany();
    console.log(`   总数: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`   - ${admin.username} (ID: ${admin.id})`);
    });

    // 2. 查看钱包
    console.log('\n2. 钱包账户:');
    const wallets = await prisma.wallet.findMany();
    console.log(`   总数: ${wallets.length}`);
    wallets.forEach(wallet => {
      console.log(`   - ${wallet.pubkey.substring(0, 8)}... (来源: ${wallet.source})`);
    });

    // 3. 查看 Agent 服务
    console.log('\n3. Agent 服务:');
    const agents = await prisma.agent.findMany({
      include: { providerWallet: true }
    });
    console.log(`   总数: ${agents.length}`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (状态: ${agent.status}, 价格: ${agent.priceUsdcMicro} 微USDC)`);
    });

    // 4. 查看订单
    console.log('\n4. 订单数据:');
    const orders = await prisma.order.findMany({
      include: { agent: true, consumerWallet: true }
    });
    console.log(`   总数: ${orders.length}`);
    orders.forEach(order => {
      console.log(`   - 订单ID: ${order.id.substring(0, 8)}..., Agent: ${order.agent.name}, 状态: ${order.status}`);
    });

    // 5. 查看收据
    console.log('\n5. 收据数据:');
    const receipts = await prisma.receipt.findMany({
      include: { order: true }
    });
    console.log(`   总数: ${receipts.length}`);
    receipts.forEach(receipt => {
      console.log(`   - 收据ID: ${receipt.id.substring(0, 8)}..., 反馈状态: ${receipt.feedbackStatus}`);
    });

    // 6. 查看评分
    console.log('\n6. 评分数据:');
    const ratings = await prisma.rating.findMany({
      include: { agent: true }
    });
    console.log(`   总数: ${ratings.length}`);
    ratings.forEach(rating => {
      console.log(`   - Agent: ${rating.agent.name}, 评分: ${rating.score}/5`);
    });

    console.log('\n=== 数据库查询完成 ===');

  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();