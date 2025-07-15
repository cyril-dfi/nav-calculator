import { ChainName } from "../types";

export function normalizeChainName(chainName: string): ChainName {
  // Convert chain name to our internal format
  const name = chainName.toLowerCase();
  if (name === "op mainnet") return "optimism";
  if (name === "base") return "base";
  if (name === "mainnet" || name === "ethereum") return "mainnet";
  if (name === "arbitrum one" || name === "arbitrum") return "arbitrum";
  if (name === "bsc" || name === "bnb smart chain") return "bsc";
  throw new Error(`Unsupported chain: ${chainName}`);
}
