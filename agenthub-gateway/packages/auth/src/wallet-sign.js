"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signMessage = signMessage;
exports.verifyWalletSignature = verifyWalletSignature;
const node_util_1 = require("node:util");
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
function signMessage(keypair, message) {
    const encoded = new node_util_1.TextEncoder().encode(message);
    const signature = tweetnacl_1.default.sign.detached(encoded, keypair.secretKey);
    return Buffer.from(signature).toString("base64");
}
function verifyWalletSignature(pubkey, message, signature) {
    const encodedMessage = new node_util_1.TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKey = new web3_js_1.PublicKey(pubkey);
    return tweetnacl_1.default.sign.detached.verify(encodedMessage, signatureBytes, publicKey.toBytes());
}
//# sourceMappingURL=wallet-sign.js.map