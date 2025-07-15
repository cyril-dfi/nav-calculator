import { Address, Chain } from "viem";
import { BlockchainService } from "./blockchainService";
import {
  ChainName,
  DexKey,
  ContractType,
  DexContracts,
  NftBalance,
  BalanceContract,
  TokenFetchCall,
} from "../types";
import { contractAddresses } from "../config/contractAddresses";
import { abis } from "../config/abis";
import { chunkArray } from "../utils/utils";
import { MULTICALL_CHUNK_SIZE } from "../config/constants";
import { normalizeChainName } from "../utils/chain";

export class NftService {
  private blockchainService: BlockchainService;
  private chain: Chain;

  constructor(chain: Chain) {
    this.blockchainService = new BlockchainService(chain);
    this.chain = chain;
  }

  async getNftBalances(walletAddresses: Address[]): Promise<NftBalance[]> {
    const dexes = Object.keys(contractAddresses) as DexKey[];
    const balanceContracts = this.createBalanceContracts(
      walletAddresses,
      dexes
    );
    const balanceChunks = chunkArray(balanceContracts, MULTICALL_CHUNK_SIZE);
    const nftBalances: NftBalance[] = [];

    for (const chunk of balanceChunks) {
      const balances = await this.blockchainService.multicall(chunk);
      const tokenFetchCalls = await this.processBalances(balances, chunk);
      if (tokenFetchCalls.length > 0) {
        const tokenIds = await this.fetchTokenIds(tokenFetchCalls);
        nftBalances.push(...tokenIds);
      }
    }

    return nftBalances;
  }

  private createBalanceContracts(
    walletAddresses: Address[],
    dexes: DexKey[]
  ): BalanceContract[] {
    return walletAddresses.flatMap((wallet) =>
      dexes.flatMap((dex) => {
        const chainName = normalizeChainName(
          this.chain.name.toLowerCase()
        ) as ChainName;
        const contracts: BalanceContract[] = [];

        // Helper function to create contract
        const addContract = (contractType: ContractType) => {
          const dexContracts = abis[dex] as DexContracts;
          const address = contractAddresses[dex]?.[chainName]?.[
            contractType
          ] as Address | undefined;
          const abi = dexContracts[contractType];
          if (address && abi) {
            contracts.push({
              address,
              abi,
              functionName: "balanceOf",
              args: [wallet] as const,
              wallet,
              dex,
            });
          }
        };

        if (dex === "pancakeswap") {
          // Check both contracts for PancakeSwap
          addContract("MasterChefV3");
          addContract("NonfungiblePositionManager");
        } else {
          // For other DEXes, just use NonfungiblePositionManager
          addContract("NonfungiblePositionManager");
        }

        return contracts;
      })
    );
  }

  private async processBalances(
    balances: any[],
    chunk: BalanceContract[]
  ): Promise<TokenFetchCall[]> {
    const tokenFetchCalls: TokenFetchCall[] = [];

    balances.forEach((balance, index) => {
      const { wallet, dex, address: nftManagerAddress, abi } = chunk[index];

      if (
        balance.status === "success" &&
        typeof balance.result === "bigint" &&
        balance.result > 0n
      ) {
        const calls = Array.from(
          { length: Number(balance.result) },
          (_, i) =>
            ({
              address: nftManagerAddress,
              abi,
              functionName: "tokenOfOwnerByIndex",
              args: [wallet, i] as const,
              wallet,
              dex,
            } as TokenFetchCall)
        );
        tokenFetchCalls.push(...calls);
      }
    });

    return tokenFetchCalls;
  }

  private async fetchTokenIds(
    tokenFetchCalls: TokenFetchCall[]
  ): Promise<NftBalance[]> {
    const tokenChunks = chunkArray(tokenFetchCalls, MULTICALL_CHUNK_SIZE);
    const balanceMap = new Map<string, NftBalance>();

    for (const tokenChunk of tokenChunks) {
      const tokenResults = await this.blockchainService.multicall(tokenChunk);

      tokenResults.forEach((result, index) => {
        if (result.status === "success" && typeof result.result === "bigint") {
          const { wallet, dex } = tokenChunk[index];
          const key = `${wallet}-${dex}`;
          const tokenId = result.result.toString();

          if (!balanceMap.has(key)) {
            balanceMap.set(key, { wallet, dex, tokenIds: [] });
          }
          balanceMap.get(key)!.tokenIds.push(tokenId);
        }
      });
    }

    return Array.from(balanceMap.values());
  }
}
