import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { createKeyPairSignerFromBytes } from "@solana/kit";
import { Keypair } from "@solana/web3.js";
import type { ClientSvmSigner } from "@x402/svm";
import { toClientSvmSigner } from "@x402/svm";
import nacl from "tweetnacl";

export interface LocalWallet {
  publicKey: string;
  signMessage(message: string): Promise<string>;
  getSvmSigner(): Promise<ClientSvmSigner>;
}

interface WalletFile {
  secretKey: number[];
}

function getDefaultWalletPath(): string {
  return process.env.AGENTHUB_WALLET_PATH ?? join(homedir(), ".agenthub", "dev-wallet.json");
}

export class FileSystemWalletStore {
  constructor(private readonly walletPath = getDefaultWalletPath()) {}

  async loadOrCreate(): Promise<{ wallet: LocalWallet; isNew: boolean }> {
    try {
      const keypair = await this.loadExisting();
      return {
        wallet: createLocalWallet(keypair),
        isNew: false,
      };
    } catch {
      const keypair = await this.create();
      return {
        wallet: createLocalWallet(keypair),
        isNew: true,
      };
    }
  }

  private async loadExisting(): Promise<Keypair> {
    const file = await readFile(this.walletPath, "utf8");
    const parsed = JSON.parse(file) as WalletFile;
    return Keypair.fromSecretKey(Uint8Array.from(parsed.secretKey));
  }

  private async create(): Promise<Keypair> {
    const keypair = Keypair.generate();
    await mkdir(dirname(this.walletPath), { recursive: true });
    await writeFile(
      this.walletPath,
      JSON.stringify({
        secretKey: Array.from(keypair.secretKey),
      } satisfies WalletFile, null, 2),
      "utf8",
    );

    return keypair;
  }
}

export function createLocalWallet(keypair: Keypair): LocalWallet {
  return {
    publicKey: keypair.publicKey.toBase58(),
    async signMessage(message: string) {
      const signature = nacl.sign.detached(Buffer.from(message, "utf8"), keypair.secretKey);
      return Buffer.from(signature).toString("base64");
    },
    async getSvmSigner() {
      const signer = await createKeyPairSignerFromBytes(keypair.secretKey);
      return toClientSvmSigner(signer);
    },
  };
}
