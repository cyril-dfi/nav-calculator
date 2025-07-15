import { Address, createPublicClient, http, PublicClient } from "viem";
import { Chain } from "viem/chains";
import { ChainName } from "../types";
import { rpcUrls } from "../config/rpcUrls";
import { sleep } from "../utils/sleep";
import { SLEEP_TIME } from "../config/constants";

export class BlockchainService {
  private client: PublicClient;

  constructor(chain: Chain) {
    const rpcUrl = rpcUrls[chain.name.toLowerCase() as ChainName];
    this.client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    initialDelay: number = SLEEP_TIME
  ): Promise<T> {
    let retries = 0;
    let delay = initialDelay;

    while (true) {
      try {
        const result = await operation();

        if (Array.isArray(result) && result.length > 0) {
          const firstResult = result[0];
          const lastResult = result[result.length - 1];
          if (
            firstResult?.status === "failure" ||
            lastResult?.status === "failure"
          ) {
            const firstError = (firstResult as any).error;
            const lastError = (lastResult as any).error;
            if (
              firstError?.details?.includes("over rate limit") ||
              firstError?.message?.includes("over rate limit") ||
              lastError?.details?.includes("over rate limit") ||
              lastError?.message?.includes("over rate limit")
            ) {
              throw new Error("Rate limit detected in result");
            }
          }
        }

        await sleep(SLEEP_TIME);
        return result;
      } catch (error) {
        const errorStr = error?.toString().toLowerCase() || "";
        const isRateLimit = errorStr.includes("rate limit");

        if (retries >= maxRetries || !isRateLimit) {
          throw error;
        }

        console.warn(
          `Rate limit exceeded, retrying in ${delay}ms (attempt ${
            retries + 1
          }/${maxRetries})`
        );
        await sleep(delay);
        retries++;
        delay *= 2; // Exponential backoff
      }
    }
  }

  async multicall<
    TContracts extends {
      address: Address;
      abi: any;
      functionName: string;
      args: readonly unknown[];
    }[]
  >(contracts: TContracts) {
    return this.retryWithBackoff(() =>
      this.client.multicall({
        contracts: contracts.map(({ address, abi, functionName, args }) => ({
          address,
          abi,
          functionName,
          args,
        })),
      })
    );
  }
}
