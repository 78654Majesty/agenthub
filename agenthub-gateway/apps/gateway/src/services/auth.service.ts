import { PrismaClient } from "@prisma/client";

import {
  buildChallengeMessage,
  CHALLENGE_TTL_SECONDS,
  createNonce,
  getChallengeExpiry,
  signJwt,
  verifyWalletSignature,
} from "../../../../packages/auth/src/index";

export interface ChallengeRecord {
  wallet: string;
  nonce: string;
  challenge: string;
  issuedAt: Date;
  expiresAt: Date;
  used: boolean;
}

export interface ChallengeStore {
  save(record: ChallengeRecord): Promise<void>;
  findLatestActive(wallet: string, currentTime: Date): Promise<ChallengeRecord | null>;
  markUsed(nonce: string): Promise<void>;
}

export interface WalletStore {
  upsertWallet(pubkey: string, source: string, lastLoginAt: Date): Promise<void>;
}

export interface CreateAuthServiceOptions {
  challengeStore: ChallengeStore;
  walletStore: WalletStore;
  jwtSecret: string;
  now?: () => Date;
}

export interface ChallengeResponse {
  challenge: string;
  nonce: string;
  expiresIn: number;
}

let prismaSingleton: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
  }

  return prismaSingleton;
}

export function createPrismaChallengeStore(): ChallengeStore {
  const prisma = getPrismaClient();

  return {
    async save(record) {
      await prisma.authChallenge.create({
        data: {
          wallet: record.wallet,
          nonce: record.nonce,
          createdAt: record.issuedAt,
          expiresAt: record.expiresAt,
          createdAt: new Date(record.expiresAt.getTime() - CHALLENGE_TTL_SECONDS * 1000),
        },
      });
    },
    async findLatestActive(wallet, currentTime) {
      const record = await prisma.authChallenge.findFirst({
        where: {
          wallet,
          used: false,
          expiresAt: {
            gt: currentTime,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!record) {
        return null;
      }

      return {
        wallet: record.wallet,
        nonce: record.nonce,
        challenge: buildChallengeMessage(record.nonce, record.createdAt),
        issuedAt: record.createdAt,
        expiresAt: record.expiresAt,
        used: record.used,
      };
    },
    async markUsed(nonce) {
      await prisma.authChallenge.update({
        where: { nonce },
        data: { used: true },
      });
    },
  };
}

export function createPrismaWalletStore(): WalletStore {
  const prisma = getPrismaClient();

  return {
    async upsertWallet(pubkey, source, lastLoginAt) {
      await prisma.wallet.upsert({
        where: { pubkey },
        create: {
          pubkey,
          source,
          lastLoginAt,
        },
        update: {
          source,
          lastLoginAt,
        },
      });
    },
  };
}

export function createAuthService(options: CreateAuthServiceOptions) {
  const now = options.now ?? (() => new Date());

  return {
    async createChallenge(wallet: string): Promise<ChallengeResponse> {
      const issuedAt = now();
      const nonce = createNonce();
      const challenge = buildChallengeMessage(nonce, issuedAt);
      const expiresAt = getChallengeExpiry(issuedAt);

      await options.challengeStore.save({
        wallet,
        nonce,
        challenge,
        issuedAt,
        expiresAt,
        used: false,
      });

      return {
        challenge,
        nonce,
        expiresIn: CHALLENGE_TTL_SECONDS,
      };
    },

    async verifyWalletLogin(input: { wallet: string; signature: string }) {
      const currentTime = now();
      const challenge = await options.challengeStore.findLatestActive(input.wallet, currentTime);
      if (!challenge) {
        throw new Error("No active challenge for wallet");
      }

      console.log("Verifying signature:", {
        wallet: input.wallet,
        challenge: challenge.challenge,
        signature: input.signature,
        signatureLength: input.signature.length
      });

      const isValid = verifyWalletSignature(input.wallet, challenge.challenge, input.signature);
      if (!isValid) {
        console.log("Signature validation failed");
        throw new Error("Invalid wallet signature");
      }

      await options.challengeStore.markUsed(challenge.nonce);
      await options.walletStore.upsertWallet(input.wallet, "local-keypair", currentTime);

      return {
        token: signJwt({ wallet_pubkey: input.wallet }, options.jwtSecret, 3600, currentTime),
        walletPubkey: input.wallet,
        expiresIn: 3600,
      };
    },
  };
}

export function getAuthService() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return createAuthService({
    challengeStore: createPrismaChallengeStore(),
    walletStore: createPrismaWalletStore(),
    jwtSecret,
  });
}
