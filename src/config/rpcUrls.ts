import { ChainName } from "../types";

import 'dotenv/config';

if (!process.env.MAINNET_RPC_URL) throw new Error('MAINNET_RPC_URL is required');
if (!process.env.BASE_RPC_URL) throw new Error('BASE_RPC_URL is required');
if (!process.env.OPTIMISM_RPC_URL) throw new Error('OPTIMISM_RPC_URL is required');
if (!process.env.ARBITRUM_RPC_URL) throw new Error('ARBITRUM_RPC_URL is required');
if (!process.env.BSC_RPC_URL) throw new Error('BSC_RPC_URL is required');

export const rpcUrls: { [key in ChainName]: string } = {
  mainnet: process.env.MAINNET_RPC_URL,
  base: process.env.BASE_RPC_URL,
  optimism: process.env.OPTIMISM_RPC_URL,
  arbitrum: process.env.ARBITRUM_RPC_URL,
  bsc: process.env.BSC_RPC_URL,
} as const;
