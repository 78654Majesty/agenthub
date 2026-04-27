/**
 * @file  src/chain/ipfs.ts
 * @owner 基建
 * @module chain
 *
 * Pinata IPFS upload and read utilities.
 * Handles JSON pinning and CID-based retrieval via Pinata gateway.
 *
 * Type hints:
 *   - ../config (config)
 *
 * Exports:
 *   - uploadJson(data)
 *   - fetchJson(cid)
 */

import { config } from "../config";

type PinataJsonUploadResponse = {
  IpfsHash: string;
};

type UploadJsonResult = {
  cid: string;
  uri: string;
};

function buildGatewayUrl(cid: string): string {
  const base = config.pinataGateway.replace(/\/+$/, "");
  return `${base}/ipfs/${cid}`;
}

function normalizeCid(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("ipfs://")) {
    return trimmed.slice("ipfs://".length);
  }
  return trimmed;
}

export async function uploadJson(
  data: unknown,
  options?: { name?: string },
): Promise<UploadJsonResult> {
  if (!config.pinataJwt) {
    throw new Error("PINATA_JWT_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.pinataJwt}`,
    },
    body: JSON.stringify({
      pinataMetadata: {
        name: options?.name ?? `agenthub-agent-metadata-${Date.now()}`,
      },
      pinataContent: data,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IPFS_UPLOAD_FAILED:${errorText || response.statusText}`);
  }

  const payload = (await response.json()) as PinataJsonUploadResponse;
  if (!payload?.IpfsHash) {
    throw new Error("IPFS_UPLOAD_FAILED:missing cid");
  }

  return {
    cid: payload.IpfsHash,
    uri: `ipfs://${payload.IpfsHash}`,
  };
}

export async function fetchJson<T = unknown>(cidOrUri: string): Promise<T> {
  const cid = normalizeCid(cidOrUri);
  const response = await fetch(buildGatewayUrl(cid), {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IPFS_FETCH_FAILED:${errorText || response.statusText}`);
  }

  return (await response.json()) as T;
}
