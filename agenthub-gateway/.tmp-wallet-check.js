const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const wallets = await p.wallet.findMany({
    select: { id: true, pubkey: true, source: true, createdAt: true, lastLoginAt: true },
  });
  const agents = await p.agent.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      chainStatus: true,
      providerWallet: { select: { pubkey: true, source: true } },
    },
  });

  console.log('=== wallets ===');
  console.log(JSON.stringify(wallets, null, 2));
  console.log('=== agents(provider wallet) ===');
  console.log(JSON.stringify(agents, null, 2));

  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
