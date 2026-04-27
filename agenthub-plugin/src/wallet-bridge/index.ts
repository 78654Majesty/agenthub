/**
 * @file      src/wallet-bridge/index.ts
 * @owner     Dev C
 * @module    wallet-bridge
 *
 * Current product path: in-process wallet SDK used by the local MCP runtime.
 *
 * This module is not a localhost HTTP service. Claude Code starts the MCP
 * runtime through the bundled `.mcp.json`; MCP tools then call this SDK to
 * create/load the local wallet, sign auth challenges, and provide the x402 SVM
 * signer.
 */

export * from "./sdk";
export * from "./wallet";
