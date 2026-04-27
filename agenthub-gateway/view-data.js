// 数据库数据查看脚本 - 英文输出
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function viewData() {
  console.log('=== AgentHub Database Data ===\n');

  try {
    // 1. Admin Users
    console.log('1. Admin Users:');
    const admins = await prisma.adminUser.findMany();
    console.log(`   Total: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`   - ${admin.username} (ID: ${admin.id})`);
    });

    // 2. Wallets
    console.log('\n2. Wallet Accounts:');
    const wallets = await prisma.wallet.findMany();
    console.log(`   Total: ${wallets.length}`);
    wallets.forEach(wallet => {
      console.log(`   - ${wallet.pubkey.substring(0, 8)}... (Source: ${wallet.source})`);
    });

    // 3. Agents
    console.log('\n3. Agent Services:');
    const agents = await prisma.agent.findMany({
      include: { providerWallet: true }
    });
    console.log(`   Total: ${agents.length}`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (Status: ${agent.status}, Price: ${agent.priceUsdcMicro} microUSDC)`);
    });

    // 4. Orders
    console.log('\n4. Order Data:');
    const orders = await prisma.order.findMany({
      include: { agent: true, consumerWallet: true }
    });
    console.log(`   Total: ${orders.length}`);
    orders.forEach(order => {
      console.log(`   - Order ID: ${order.id.substring(0, 8)}..., Agent: ${order.agent.name}, Status: ${order.status}`);
    });

    // 5. Receipts
    console.log('\n5. Receipt Data:');
    const receipts = await prisma.receipt.findMany({
      include: { order: true }
    });
    console.log(`   Total: ${receipts.length}`);
    receipts.forEach(receipt => {
      console.log(`   - Receipt ID: ${receipt.id.substring(0, 8)}..., Feedback Status: ${receipt.feedbackStatus}`);
    });

    // 6. Ratings
    console.log('\n6. Rating Data:');
    const ratings = await prisma.rating.findMany({
      include: { agent: true }
    });
    console.log(`   Total: ${ratings.length}`);
    ratings.forEach(rating => {
      console.log(`   - Agent: ${rating.agent.name}, Score: ${rating.score}/5`);
    });

    console.log('\n=== Database Query Complete ===');

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewData();