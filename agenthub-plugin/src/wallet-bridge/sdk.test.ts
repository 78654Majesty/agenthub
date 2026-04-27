import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FileSystemWalletStore } from "./wallet";
import { FileSystemWalletBridge } from "./sdk";

test("wallet bridge reuses the same wallet across connect and status calls", async () => {
  const walletPath = join(tmpdir(), `agenthub-wallet-bridge-${Date.now()}.json`);
  const walletStore = new FileSystemWalletStore(walletPath);
  const bridge = new FileSystemWalletBridge(walletStore);

  try {
    const connected = await bridge.connectWallet();
    const status = await bridge.getStatus();

    assert.equal(connected.isNew, true);
    assert.equal(status.connected, true);
    assert.equal(status.walletPubkey, connected.wallet.publicKey);
    assert.equal(status.network, "solana:devnet");
  } finally {
    await rm(walletPath, { force: true });
  }
});

test("wallet bridge signs messages with the connected wallet", async () => {
  const walletPath = join(tmpdir(), `agenthub-wallet-bridge-sign-${Date.now()}.json`);
  const walletStore = new FileSystemWalletStore(walletPath);
  const bridge = new FileSystemWalletBridge(walletStore);

  try {
    const connected = await bridge.connectWallet();
    const signature = await bridge.signMessage("agenthub:challenge");

    assert.equal(typeof signature, "string");
    assert.notEqual(signature.length, 0);

    const status = await bridge.getStatus();
    assert.equal(status.walletPubkey, connected.wallet.publicKey);
  } finally {
    await rm(walletPath, { force: true });
  }
});

test("wallet bridge exposes an SVM transaction signer for x402", async () => {
  const walletPath = join(tmpdir(), `agenthub-wallet-bridge-signer-${Date.now()}.json`);
  const walletStore = new FileSystemWalletStore(walletPath);
  const bridge = new FileSystemWalletBridge(walletStore);

  try {
    const connected = await bridge.connectWallet();
    const signer = await bridge.getSvmSigner();
    const transactionSigner = signer as {
      signTransactions?: unknown;
      modifyAndSignTransactions?: unknown;
    };

    assert.equal(String(signer.address), connected.wallet.publicKey);
    assert.equal(
      typeof transactionSigner.signTransactions === "function" ||
        typeof transactionSigner.modifyAndSignTransactions === "function",
      true,
    );
  } finally {
    await rm(walletPath, { force: true });
  }
});
