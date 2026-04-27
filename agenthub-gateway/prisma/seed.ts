import { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { hashPassword } from "../packages/auth/src/admin-auth";

const prisma = new PrismaClient();
const ADMIN_USERNAME = process.env.ADMIN_SEED_USERNAME?.trim() || "admin";
const ADMIN_SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD?.trim();

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function microUsdc(usdc: number): number {
  return Math.round(usdc * 1_000_000);
}

async function main() {
  if (!ADMIN_SEED_PASSWORD) {
    throw new Error("ADMIN_SEED_PASSWORD is required for seeding admin user");
  }

  const adminPasswordHash = await hashPassword(ADMIN_SEED_PASSWORD);

  console.log("Seeding database...");

  // ── AdminUser ──
  const admin = await prisma.adminUser.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      passwordHash: adminPasswordHash,
    },
    create: {
      username: ADMIN_USERNAME,
      passwordHash: adminPasswordHash,
    },
  });
  console.log(`  AdminUser: ${admin.username} (${admin.id})`);

  // ── Wallets ──
  const walletProvider1 = await prisma.wallet.upsert({
    where: { pubkey: "7Hk3nVfE9xKzR1pQ4wM8bY2cJ5dA6tL3sF9aPqProvider1" },
    update: {},
    create: {
      pubkey: "7Hk3nVfE9xKzR1pQ4wM8bY2cJ5dA6tL3sF9aPqProvider1",
      source: "web",
    },
  });

  const walletProvider2 = await prisma.wallet.upsert({
    where: { pubkey: "3Mq7kR2pX8nVf5wB1cJ4dA6tL9sF0aPqE7xKzProvider2" },
    update: {},
    create: {
      pubkey: "3Mq7kR2pX8nVf5wB1cJ4dA6tL9sF0aPqE7xKzProvider2",
      source: "web",
    },
  });

  const walletConsumer1 = await prisma.wallet.upsert({
    where: { pubkey: "5xK9mQr2pX8nVf1wB3cJ4dA6tL7sF0aPqE9xConsumer1" },
    update: {},
    create: {
      pubkey: "5xK9mQr2pX8nVf1wB3cJ4dA6tL7sF0aPqE9xConsumer1",
      source: "cli",
    },
  });

  const walletConsumer2 = await prisma.wallet.upsert({
    where: { pubkey: "9pQr4vBm8nVf2wB6cJ1dA3tL5sF7aPqE0xKzConsumer2" },
    update: {},
    create: {
      pubkey: "9pQr4vBm8nVf2wB6cJ1dA3tL5sF7aPqE0xKzConsumer2",
      source: "cli",
    },
  });

  console.log(
    `  Wallets: ${[walletProvider1, walletProvider2, walletConsumer1, walletConsumer2].map((w) => w.pubkey.slice(0, 8) + "...").join(", ")}`
  );

  // ── Agents ──
  const agentSecurity = await prisma.agent.upsert({
    where: { id: "seed-agent-security" },
    update: {},
    create: {
      id: "seed-agent-security",
      providerWalletId: walletProvider1.id,
      name: "Contract Sentinel",
      description:
        "Automated smart contract security analysis with real-time vulnerability detection for Solana programs. Specializes in reentrancy, integer overflow, and access control audits.",
      capabilityTags: JSON.stringify([
        "security",
        "audit",
        "solana",
        "smart-contract",
      ]),
      skills: JSON.stringify([
        "natural_language_processing/code_review",
        "security/vulnerability_scan",
      ]),
      domains: JSON.stringify([
        "technology/software_engineering",
        "technology/blockchain",
      ]),
      priceUsdcMicro: microUsdc(2.5),
      endpointUrl: "https://agent-sentinel.example.com/execute",
      status: "active",
      chainStatus: "registered",
      solAssetAddress: "FakeAsset1111111111111111111111111111111111",
      ipfsCid: "QmFakeCid1SecurityAgentMetadataHash123456789",
      ipfsUri: "ipfs://QmFakeCid1SecurityAgentMetadataHash123456789",
      solPublishTx: "FakeTx1111111111111111111111111111111111111111",
      registeredAt: new Date("2026-03-15T10:00:00Z"),
      ratingAvg: 4.8,
      ratingCount: 89,
      totalOrders: 423,
      avgResponseTimeMs: 1200,
    },
  });

  const agentCodeReview = await prisma.agent.upsert({
    where: { id: "seed-agent-codereview" },
    update: {},
    create: {
      id: "seed-agent-codereview",
      providerWalletId: walletProvider1.id,
      name: "CodeReview Pro",
      description:
        "AI-powered code review agent. Provides detailed feedback on code quality, patterns, performance, and best practices across TypeScript, Rust, and Python.",
      capabilityTags: JSON.stringify([
        "code-review",
        "typescript",
        "rust",
        "python",
      ]),
      skills: JSON.stringify([
        "natural_language_processing/code_review",
        "natural_language_processing/summarization",
      ]),
      domains: JSON.stringify(["technology/software_engineering"]),
      priceUsdcMicro: microUsdc(1.8),
      endpointUrl: "https://agent-codereview.example.com/execute",
      status: "active",
      chainStatus: "registered",
      solAssetAddress: "FakeAsset2222222222222222222222222222222222",
      ipfsCid: "QmFakeCid2CodeReviewAgentMetadataHash12345678",
      ipfsUri: "ipfs://QmFakeCid2CodeReviewAgentMetadataHash12345678",
      solPublishTx: "FakeTx2222222222222222222222222222222222222222",
      registeredAt: new Date("2026-03-20T14:00:00Z"),
      ratingAvg: 4.5,
      ratingCount: 56,
      totalOrders: 312,
      avgResponseTimeMs: 800,
    },
  });

  const agentResearch = await prisma.agent.upsert({
    where: { id: "seed-agent-research" },
    update: {},
    create: {
      id: "seed-agent-research",
      providerWalletId: walletProvider2.id,
      name: "DeFi Research Analyst",
      description:
        "Deep research agent for DeFi protocols, tokenomics analysis, and market trend reports. Aggregates on-chain data and off-chain signals.",
      capabilityTags: JSON.stringify([
        "defi",
        "research",
        "analytics",
        "tokenomics",
      ]),
      skills: JSON.stringify([
        "data_analysis/market_research",
        "natural_language_processing/summarization",
      ]),
      domains: JSON.stringify([
        "finance/defi",
        "finance/cryptocurrency",
      ]),
      priceUsdcMicro: microUsdc(4.0),
      endpointUrl: "https://agent-research.example.com/execute",
      status: "active",
      chainStatus: "registered",
      solAssetAddress: "FakeAsset3333333333333333333333333333333333",
      ipfsCid: "QmFakeCid3ResearchAgentMetadataHash1234567890",
      ipfsUri: "ipfs://QmFakeCid3ResearchAgentMetadataHash1234567890",
      solPublishTx: "FakeTx3333333333333333333333333333333333333333",
      registeredAt: new Date("2026-04-01T09:00:00Z"),
      ratingAvg: 4.2,
      ratingCount: 34,
      totalOrders: 156,
      avgResponseTimeMs: 2500,
    },
  });

  const agentWeather = await prisma.agent.upsert({
    where: { id: "seed-agent-weather" },
    update: {
      endpointUrl: process.env.AGENTHUB_WEATHER_AGENT_ENDPOINT ?? "http://127.0.0.1:9000/v1/execute",
      status: "active",
      priceUsdcMicro: microUsdc(0.01),
    },
    create: {
      id: "seed-agent-weather",
      providerWalletId: walletProvider2.id,
      name: "AgentHub Weather",
      description:
        "x402 payment-gated weather agent that returns current weather for a requested city using Solana devnet USDC.",
      capabilityTags: JSON.stringify(["weather", "forecast", "open-meteo"]),
      skills: JSON.stringify(["data_analysis/weather_lookup"]),
      domains: JSON.stringify(["consumer/weather", "technology/api"]),
      priceUsdcMicro: microUsdc(0.01),
      endpointUrl: process.env.AGENTHUB_WEATHER_AGENT_ENDPOINT ?? "http://127.0.0.1:9000/v1/execute",
      status: "active",
      chainStatus: "registered",
      solAssetAddress: "FakeWeatherAsset111111111111111111111111111",
      ipfsCid: "QmFakeWeatherAgentMetadataHash123456789",
      ipfsUri: "ipfs://QmFakeWeatherAgentMetadataHash123456789",
      solPublishTx: "FakeWeatherPublishTx111111111111111111111111",
      registeredAt: new Date("2026-04-22T09:00:00Z"),
      ratingAvg: 4.9,
      ratingCount: 1,
      totalOrders: 0,
      avgResponseTimeMs: 600,
    },
  });

  const agentPending = await prisma.agent.upsert({
    where: { id: "seed-agent-pending" },
    update: {},
    create: {
      id: "seed-agent-pending",
      providerWalletId: walletProvider2.id,
      name: "Rug Detector",
      description:
        "Automated rug pull risk assessment for new Solana tokens. Analyzes liquidity, holder distribution, and contract patterns.",
      capabilityTags: JSON.stringify([
        "security",
        "defi",
        "risk-assessment",
      ]),
      skills: JSON.stringify(["security/risk_assessment"]),
      domains: JSON.stringify(["finance/defi", "technology/blockchain"]),
      priceUsdcMicro: microUsdc(3.0),
      endpointUrl: "https://agent-rugdetector.example.com/execute",
      status: "pending_review",
      chainStatus: "none",
      ratingAvg: 0,
      ratingCount: 0,
      totalOrders: 0,
      avgResponseTimeMs: 0,
    },
  });

  console.log(
    `  Agents: ${[agentSecurity, agentCodeReview, agentResearch, agentWeather, agentPending].map((a) => `${a.name}(${a.status})`).join(", ")}`
  );

  // ── Quotes + Orders + Receipts + Ratings ──
  // Consumer1 调用了 SecurityAgent 3 次，CodeReview 1 次
  // Consumer2 调用了 ResearchAgent 2 次

  const seedOrders = [
    {
      consumer: walletConsumer1,
      agent: agentSecurity,
      task: "Audit my Solana program for reentrancy vulnerabilities",
      amount: microUsdc(2.5),
      responseMs: 1100,
      rating: { score: 5, comment: "Excellent vulnerability detection, found 3 critical issues." },
    },
    {
      consumer: walletConsumer1,
      agent: agentSecurity,
      task: "Review token transfer logic for integer overflow risks",
      amount: microUsdc(2.5),
      responseMs: 950,
      rating: { score: 5, comment: "Very thorough analysis." },
    },
    {
      consumer: walletConsumer1,
      agent: agentSecurity,
      task: "Check access control on admin functions",
      amount: microUsdc(2.5),
      responseMs: 1400,
      rating: null,
    },
    {
      consumer: walletConsumer1,
      agent: agentCodeReview,
      task: "Review my TypeScript API handlers for best practices",
      amount: microUsdc(1.8),
      responseMs: 700,
      rating: { score: 4, comment: "Good suggestions, missed a few edge cases." },
    },
    {
      consumer: walletConsumer2,
      agent: agentResearch,
      task: "Analyze tokenomics of Jupiter DEX governance token",
      amount: microUsdc(4.0),
      responseMs: 2200,
      rating: { score: 4, comment: "Detailed report, well-structured." },
    },
    {
      consumer: walletConsumer2,
      agent: agentResearch,
      task: "Compare yield strategies across Solana DeFi protocols",
      amount: microUsdc(4.0),
      responseMs: 3100,
      rating: { score: 5, comment: "Incredibly comprehensive analysis." },
    },
  ];

  for (let i = 0; i < seedOrders.length; i++) {
    const s = seedOrders[i];
    const idx = String(i + 1).padStart(2, "0");
    const quoteId = `seed-quote-${idx}`;
    const orderId = `seed-order-${idx}`;
    const receiptId = `seed-receipt-${idx}`;
    const fakeTx = `FakePayTx${idx}${"0".repeat(40)}`.slice(0, 44);
    const createdAt = new Date(
      Date.now() - (seedOrders.length - i) * 24 * 60 * 60 * 1000
    );

    await prisma.quote.upsert({
      where: { id: quoteId },
      update: {},
      create: {
        id: quoteId,
        agentId: s.agent.id,
        consumerWalletId: s.consumer.id,
        taskText: s.task,
        amountUsdcMicro: s.amount,
        status: "accepted",
        expiresAt: new Date(createdAt.getTime() + 5 * 60 * 1000),
        createdAt,
      },
    });

    await prisma.order.upsert({
      where: { id: orderId },
      update: {},
      create: {
        id: orderId,
        quoteId,
        agentId: s.agent.id,
        consumerWalletId: s.consumer.id,
        status: "completed",
        paymentTx: fakeTx,
        paymentVerified: true,
        paymentPayer: s.consumer.pubkey,
        paymentAmount: s.amount,
        paymentNetwork: "solana:devnet",
        resultHash: sha256(`result-${idx}`),
        responseTimeMs: s.responseMs,
        createdAt,
      },
    });

    await prisma.receipt.upsert({
      where: { id: receiptId },
      update: {},
      create: {
        id: receiptId,
        orderId,
        agentId: s.agent.id,
        consumerWalletId: s.consumer.id,
        receiptHash: sha256(`receipt-${idx}`),
        amountUsdcMicro: s.amount,
        feedbackStatus: "submitted",
        feedbackTx: `FakeFeedbackTx${idx}${"0".repeat(30)}`.slice(0, 44),
        feedbackIpfsCid: `QmFakeFeedback${idx}Hash${"0".repeat(20)}`.slice(
          0,
          46
        ),
        feedbackAt: new Date(createdAt.getTime() + 30 * 1000),
        createdAt,
      },
    });

    if (s.rating) {
      const ratingId = `seed-rating-${idx}`;
      await prisma.rating.upsert({
        where: { id: ratingId },
        update: {},
        create: {
          id: ratingId,
          receiptId,
          agentId: s.agent.id,
          consumerWalletId: s.consumer.id,
          score: s.rating.score,
          comment: s.rating.comment,
          feedbackStatus: "submitted",
          feedbackTx: `FakeRatingTx${idx}${"0".repeat(32)}`.slice(0, 44),
          feedbackIpfsCid: `QmFakeRating${idx}Hash${"0".repeat(22)}`.slice(
            0,
            46
          ),
          createdAt,
        },
      });
    }
  }

  console.log(`  Orders: ${seedOrders.length} (with receipts + ratings)`);

  // ── 一条失败 Receipt（Admin Failed Receipts 页面测试用）──
  const failedQuoteId = "seed-quote-failed";
  const failedOrderId = "seed-order-failed";
  const failedReceiptId = "seed-receipt-failed";
  const failedCreatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

  await prisma.quote.upsert({
    where: { id: failedQuoteId },
    update: {},
    create: {
      id: failedQuoteId,
      agentId: agentSecurity.id,
      consumerWalletId: walletConsumer2.id,
      taskText: "Scan this token contract for backdoors",
      amountUsdcMicro: microUsdc(2.5),
      status: "accepted",
      expiresAt: new Date(failedCreatedAt.getTime() + 5 * 60 * 1000),
      createdAt: failedCreatedAt,
    },
  });

  await prisma.order.upsert({
    where: { id: failedOrderId },
    update: {},
    create: {
      id: failedOrderId,
      quoteId: failedQuoteId,
      agentId: agentSecurity.id,
      consumerWalletId: walletConsumer2.id,
      status: "completed",
      paymentTx: "FakePayTxFailed0000000000000000000000000000",
      paymentVerified: true,
      paymentPayer: walletConsumer2.pubkey,
      paymentAmount: microUsdc(2.5),
      paymentNetwork: "solana:devnet",
      resultHash: sha256("result-failed"),
      responseTimeMs: 1500,
      createdAt: failedCreatedAt,
    },
  });

  await prisma.receipt.upsert({
    where: { id: failedReceiptId },
    update: {},
    create: {
      id: failedReceiptId,
      orderId: failedOrderId,
      agentId: agentSecurity.id,
      consumerWalletId: walletConsumer2.id,
      receiptHash: sha256("receipt-failed"),
      amountUsdcMicro: microUsdc(2.5),
      feedbackStatus: "failed",
      retryCount: 3,
      createdAt: failedCreatedAt,
    },
  });

  console.log("  Failed Receipt: 1 (for Admin testing)");
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
