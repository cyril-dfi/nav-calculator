import { Address, Abi, Chain } from "viem";
import { abis } from "./config/abis";

export type ChainName = "mainnet" | "base" | "optimism" | "arbitrum" | "bsc";

export type DexKey = keyof typeof abis;

export type ContractType = "MasterChefV3" | "NonfungiblePositionManager";

export type DexContracts = {
  [K in ContractType]?: Abi;
};

export type DexType =
  | "aerodrome"
  | "uniswap"
  | "velodrome"
  | "pancakeswap"
  | "camelot";

export interface PoolGauge {
  pool: Address;
  gauge: Address;
  dex: DexType;
  chain: Chain;
}

export interface ContractAddresses {
  [dex: string]: {
    [chain in ChainName]?: {
      NonfungiblePositionManager: Address;
      Factory: Address;
      MasterChefV3?: Address;
    };
  };
}

export type RpcUrls = Record<ChainName, string>;

export interface Position {
  chain: string;
  chainId: number;
  dex: string;
  tokenIds: string[];
  details: PositionDetail[];
}

export interface Result {
  wallets: {
    [address: string]: {
      positions: Position[];
    };
  };
}

export interface NftBalance {
  wallet: Address;
  dex: DexKey;
  tokenIds: string[];
}

export interface BalanceContract {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly [Address];
  wallet: Address;
  dex: DexKey;
}

export interface TokenFetchCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly [Address, number];
  wallet: Address;
  dex: DexKey;
  position: Position;
}

export interface NftPosition {
  wallet: Address;
  dex: DexKey;
  tokenId: string;
}

export interface PositionDetail {
  pool: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  sqrtPriceX96: bigint;
  amount0?: bigint;
  amount1?: bigint;
  token0Symbol?: string;
  token1Symbol?: string;
  token0Decimals?: number;
  token1Decimals?: number;
  navPrice?: number;
}

export interface PositionResult {
  wallet: Address;
  dex: DexKey;
  tokenId: string;
  details: PositionDetail;
}

export interface PoolData {
  index: number;
  pool: Address;
  gauge: Address;
  gaugeFetched: boolean;
  dex: DexType;
  chain: Chain;
}
