/**
 * @file wallet.ts
 * @owner 基建
 * @module lib/wallet
 *
 * Browser-side wallet provider helpers for Solana signature auth.
 *
 * Exports:
 *   - WALLET_OPTIONS
 *   - detectWallets()
 *   - getWalletProvider()
 *   - connectWallet()
 *   - signLoginMessage()
 */

export type WalletId = "phantom" | "solflare" | "backpack";

export type WalletOption = {
  id: WalletId;
  name: string;
  description: string;
  accent: string;
  iconText: string;
};

export type DetectedWalletOption = WalletOption & {
  installed: boolean;
};

type SignMessageOutput =
  | Uint8Array
  | {
      signature: Uint8Array;
    };

type WalletConnectOutput = {
  publicKey?: {
    toBase58?: () => string;
    toString: () => string;
  };
};

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: {
    toBase58?: () => string;
    toString: () => string;
  };
  connect: () => Promise<WalletConnectOutput>;
  signMessage: (message: Uint8Array, display?: "utf8" | "hex") => Promise<SignMessageOutput>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: SolanaWalletProvider;
    };
    solana?: SolanaWalletProvider;
    solflare?: SolanaWalletProvider;
    backpack?: {
      solana?: SolanaWalletProvider;
    };
  }
}

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "phantom",
    name: "Phantom",
    description: "Most popular Solana wallet",
    accent: "linear-gradient(180deg, #8B7CF7 0%, #5B4FE8 100%)",
    iconText: "P",
  },
  {
    id: "solflare",
    name: "Solflare",
    description: "Secure Solana wallet",
    accent: "linear-gradient(180deg, #FFB347 0%, #FF7A00 100%)",
    iconText: "S",
  },
  {
    id: "backpack",
    name: "Backpack",
    description: "xNFT-enabled wallet",
    accent: "linear-gradient(180deg, #FF758C 0%, #F24C5A 100%)",
    iconText: "B",
  },
];

function getProviderFromWindow(walletId: WalletId): SolanaWalletProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  switch (walletId) {
    case "phantom":
      return window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null);
    case "solflare":
      return window.solflare ?? (window.solana?.isSolflare ? window.solana : null);
    case "backpack":
      return window.backpack?.solana ?? (window.solana?.isBackpack ? window.solana : null);
    default:
      return null;
  }
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof window === "undefined") {
    return "";
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary);
}

function getPublicKeyString(provider: SolanaWalletProvider, output?: WalletConnectOutput): string {
  const publicKey = output?.publicKey ?? provider.publicKey;

  if (!publicKey) {
    throw new Error("Wallet did not provide a public key.");
  }

  return publicKey.toBase58?.() ?? publicKey.toString();
}

export function detectWallets(): DetectedWalletOption[] {
  return WALLET_OPTIONS.map((wallet) => ({
    ...wallet,
    installed: Boolean(getProviderFromWindow(wallet.id)),
  }));
}

export function getWalletProvider(walletId: WalletId): SolanaWalletProvider | null {
  return getProviderFromWindow(walletId);
}

export async function connectWallet(walletId: WalletId): Promise<{ walletAddress: string; provider: SolanaWalletProvider }> {
  const provider = getProviderFromWindow(walletId);
  if (!provider) {
    throw new Error(`${WALLET_OPTIONS.find((wallet) => wallet.id === walletId)?.name ?? "Wallet"} is not installed.`);
  }

  const output = await provider.connect();
  return {
    walletAddress: getPublicKeyString(provider, output),
    provider,
  };
}

export async function signLoginMessage(provider: SolanaWalletProvider, message: string): Promise<string> {
  const encodedMessage = new TextEncoder().encode(message);
  const result = await provider.signMessage(encodedMessage, "utf8");
  const signature = result instanceof Uint8Array ? result : result.signature;

  if (!signature) {
    throw new Error("Wallet did not return a signature.");
  }

  return encodeBase64(signature);
}
