import { Address, Chain } from "viem";
import { BlockchainService } from "./blockchainService";
import { TokenService } from "./tokenService";
import { LSTPricesService } from "./lstPricesService";
import { contractAddresses } from "../config/contractAddresses";
import { abis } from "../config/abis";
import { DexType, NftPosition, PositionDetail, PositionResult } from "../types";
import { MULTICALL_CHUNK_SIZE, LST_CONTRACTS } from "../config/constants";
import { chunkArray } from "../utils/utils";
import { normalizeChainName } from "../utils/chain";
import { getAmountsForPosition } from "../utils/amounts";

export class PositionService {
  private blockchainService: BlockchainService;
  private tokenService: TokenService;
  private chain: Chain;

  constructor(chain: Chain) {
    this.blockchainService = new BlockchainService(chain);
    this.tokenService = new TokenService(chain);
    this.chain = chain;
  }

  async getPositionDetails(
    positions: NftPosition[]
  ): Promise<PositionResult[]> {
    const results: PositionResult[] = [];
    const positionChunks = chunkArray(positions, MULTICALL_CHUNK_SIZE);
    for (const chunk of positionChunks) {
      const positionCalls = chunk
        .map(({ wallet, dex, tokenId }) => {
          const chainName = normalizeChainName(this.chain.name);
          const nftManagerAddress =
            contractAddresses[dex]?.[chainName]?.["NonfungiblePositionManager"];
          const abi = abis[dex]?.["NonfungiblePositionManager"];
          if (!nftManagerAddress || !abi) return null;

          return {
            address: nftManagerAddress,
            abi,
            functionName: "positions",
            args: [BigInt(tokenId)] as const,
            wallet,
            dex,
            tokenId,
          };
        })
        .filter((call): call is NonNullable<typeof call> => call !== null);

      const positionResults = await this.blockchainService.multicall(
        positionCalls
      );

      type PoolCall = {
        address: Address;
        abi: any;
        functionName: string;
        args: readonly [Address, Address] | readonly [Address, Address, number];
        position: PositionResult;
      };

      const poolCalls: PoolCall[] = [];

      positionResults.forEach((result, index) => {
        if (result.status === "success" && Array.isArray(result.result)) {
          const { wallet, dex, tokenId } = positionCalls[index];
          const details: PositionDetail = {
            pool: "0x0000000000000000000000000000000000000000" as Address,
            token0: result.result[2] as Address,
            token1: result.result[3] as Address,
            fee: dex === "camelot" ? 0 : Number(result.result[4]),
            tickLower:
              dex === "camelot"
                ? Number(result.result[4])
                : Number(result.result[5]),
            tickUpper:
              dex === "camelot"
                ? Number(result.result[5])
                : Number(result.result[6]),
            liquidity:
              dex === "camelot"
                ? (result.result[6] as bigint)
                : (result.result[7] as bigint),
            sqrtPriceX96: 0n,
          };

          const position: PositionResult = { wallet, dex, tokenId, details };
          results.push(position);

          // Create pool fetch call
          const chainName = normalizeChainName(this.chain.name);
          const factoryAddress = contractAddresses[dex]?.[chainName]?.Factory;
          const factoryAbi = abis[dex]?.Factory;
          if (factoryAddress && factoryAbi) {
            if (dex === "camelot") {
              poolCalls.push({
                address: factoryAddress,
                abi: factoryAbi,
                functionName: "poolByPair",
                args: [
                  details.token0 as Address,
                  details.token1 as Address,
                ] as const,
                position,
              });
            } else {
              poolCalls.push({
                address: factoryAddress,
                abi: factoryAbi,
                functionName: "getPool",
                args: [details.token0, details.token1, details.fee] as const,
                position,
              });
            }
          }
        }
      });

      // Fetch pool addresses
      if (poolCalls.length > 0) {
        const poolChunks = chunkArray(poolCalls, MULTICALL_CHUNK_SIZE);
        for (const poolChunk of poolChunks) {
          const poolResults = await this.blockchainService.multicall(poolChunk);

          const slot0Calls: {
            address: Address;
            abi: any;
            functionName: string;
            args: readonly [];
            position: PositionResult;
          }[] = [];

          poolResults.forEach((result, index) => {
            if (
              result.status === "success" &&
              typeof result.result === "string" &&
              result.result.startsWith("0x")
            ) {
              const poolAddress = result.result as Address;
              poolChunk[index].position.details.pool = poolAddress;

              // Add slot0 call for this pool
              const poolAbi = abis[poolChunk[index].position.dex]?.Pool;
              if (poolAbi) {
                if (poolChunk[index].position.dex === "camelot") {
                  slot0Calls.push({
                    address: poolAddress,
                    abi: poolAbi,
                    functionName: "globalState",
                    args: [] as const,
                    position: poolChunk[index].position,
                  });
                } else {
                  slot0Calls.push({
                    address: poolAddress,
                    abi: poolAbi,
                    functionName: "slot0",
                    args: [] as const,
                    position: poolChunk[index].position,
                  });
                }
              }
            }
          });

          // Fetch slot0 data for pools
          if (slot0Calls.length > 0) {
            const slot0Results = await this.blockchainService.multicall(
              slot0Calls
            );
            slot0Results.forEach((result, index) => {
              if (result.status === "success" && Array.isArray(result.result)) {
                slot0Calls[index].position.details.sqrtPriceX96 = result
                  .result[0] as bigint;
              }
            });
          }
        }
      }
    }

    // Get token info for all positions
    const tokenAddresses = new Set<Address>();
    results.forEach((position) => {
      tokenAddresses.add(position.details.token0);
      tokenAddresses.add(position.details.token1);
    });

    const tokenInfo = await this.tokenService.getTokenInfo(
      Array.from(tokenAddresses)
    );

    // Add token info to positions
    results.forEach((position) => {
      const token0Info = tokenInfo.get(position.details.token0);
      const token1Info = tokenInfo.get(position.details.token1);
      if (token0Info) {
        position.details.token0Symbol = token0Info.symbol;
        position.details.token0Decimals = token0Info.decimals;
      }
      if (token1Info) {
        position.details.token1Symbol = token1Info.symbol;
        position.details.token1Decimals = token1Info.decimals;
      }
    });

    // Calculate amounts for each position
    // Initialize LSTPricesService for LST price lookups
    const lstPricesService = new LSTPricesService();

    for (const position of results) {
      const {
        sqrtPriceX96,
        tickLower,
        tickUpper,
        liquidity,
        token0Symbol,
        token1Symbol,
      } = position.details;
      if (
        sqrtPriceX96 &&
        tickLower !== undefined &&
        tickUpper !== undefined &&
        liquidity
      ) {
        const { amount0, amount1 } = getAmountsForPosition(
          sqrtPriceX96,
          tickLower,
          tickUpper,
          liquidity
        );
        position.details.amount0 = amount0;
        position.details.amount1 = amount1;

        // Calculate navPrice
        if (token0Symbol && token1Symbol) {
          const poolPrice =
            Number(sqrtPriceX96 * sqrtPriceX96) / Number(2n ** 192n);

          try {
            if (token0Symbol.toUpperCase() === "WETH") {
              // If token0 is WETH, use LST price of token1
              const lstPrice = await lstPricesService.getRedeemPrice(token1Symbol);
              position.details.navPrice = lstPrice;
            } else if (token1Symbol.toUpperCase() === "WETH") {
              // If token1 is WETH, use inverse of LST price of token0
              const lstPrice = await lstPricesService.getRedeemPrice(token0Symbol);
              position.details.navPrice = 1 / lstPrice;
            } else {
              // Default case: use pool price
              position.details.navPrice = poolPrice;
            }
          } catch (error) {
            console.error(
              `Error calculating navPrice for position ${position.tokenId}:`,
              error
            );
            position.details.navPrice = poolPrice; // Fallback to pool price
          }
        }
      }
    }

    return results;
  }
}
