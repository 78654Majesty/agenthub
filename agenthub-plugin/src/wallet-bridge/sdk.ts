import type { LocalWallet } from "./wallet";
import type { ClientSvmSigner } from "@x402/svm";
import { FileSystemWalletStore } from "./wallet";

export interface ConnectedWallet {
  wallet: LocalWallet;
  isNew: boolean;
}

export interface WalletBridgeStatus {
  connected: boolean;
  walletPubkey: string | null;
  network: "solana:devnet";
}

export interface WalletBridge {
  connectWallet(): Promise<ConnectedWallet>;
  getStatus(): Promise<WalletBridgeStatus>;
  signMessage(message: string): Promise<string>;
  getSvmSigner(): Promise<ClientSvmSigner>;
}

export class FileSystemWalletBridge implements WalletBridge {
  private connectedWallet: ConnectedWallet | null = null;

  constructor(private readonly walletStore = new FileSystemWalletStore()) {}

  async connectWallet(): Promise<ConnectedWallet> {
    if (this.connectedWallet) {
      return {
        wallet: this.connectedWallet.wallet,
        isNew: false,
      };
    }

    const connectedWallet = await this.walletStore.loadOrCreate();
    this.connectedWallet = connectedWallet;
    return connectedWallet;
  }

  async getStatus(): Promise<WalletBridgeStatus> {
    const connectedWallet = this.connectedWallet ?? (await this.connectWallet());

    return {
      connected: true,
      walletPubkey: connectedWallet.wallet.publicKey,
      network: "solana:devnet",
    };
  }

  async signMessage(message: string): Promise<string> {
    const connectedWallet = this.connectedWallet ?? (await this.connectWallet());
    return connectedWallet.wallet.signMessage(message);
  }

  async getSvmSigner(): Promise<ClientSvmSigner> {
    const connectedWallet = this.connectedWallet ?? (await this.connectWallet());
    return connectedWallet.wallet.getSvmSigner();
  }
}
