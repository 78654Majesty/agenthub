import { TextEncoder } from "node:util";

import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export function signMessage(keypair: Keypair, message: string): string {
  const encoded = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(encoded, keypair.secretKey);
  return Buffer.from(signature).toString("base64");
}

export function verifyWalletSignature(pubkey: string, message: string, signature: string): boolean {
  const encodedMessage = new TextEncoder().encode(message);
  const signatureBytes = Buffer.from(signature, "base64");
  const publicKey = new PublicKey(pubkey);

  return nacl.sign.detached.verify(encodedMessage, signatureBytes, publicKey.toBytes());
}
