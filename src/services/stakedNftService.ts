import { Chain, Address, parseAbi } from "viem";
import { BlockchainService } from "./blockchainService";
import { sleep } from "../utils/sleep";
import { MULTICALL_CHUNK_SIZE } from "../config/constants";
import { chunkArray } from "../utils/utils";
import { SLEEP_TIME } from "../config/constants";

const CLGaugeAbi = parseAbi([
  "function stakedValues(address) view returns (uint256[])",
]);

export interface StakedNft {
  wallet: Address;
  gauge: Address;
  nftIds: bigint[];
}

export class StakedNftService {
  private blockchainService: BlockchainService;

  constructor(chain: Chain) {
    this.blockchainService = new BlockchainService(chain);
  }

  async getStakedNfts(
    wallets: Address[],
    gauges: Address[]
  ): Promise<StakedNft[]> {
    const results: StakedNft[] = [];

    // Create multicall chunks for each wallet-gauge combination
    const calls = wallets.flatMap((wallet) =>
      gauges.map((gauge) => ({
        address: gauge,
        abi: CLGaugeAbi,
        functionName: "stakedValues",
        args: [wallet] as const,
      }))
    );

    const chunks = chunkArray(calls, MULTICALL_CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkResults = await this.blockchainService.multicall(chunk);
      await sleep(SLEEP_TIME);

      chunkResults.forEach((result, j) => {
        const walletIndex = Math.floor(
          (i * MULTICALL_CHUNK_SIZE + j) / gauges.length
        );
        const gaugeIndex = (i * MULTICALL_CHUNK_SIZE + j) % gauges.length;

        const wallet = wallets[walletIndex];
        const gauge = gauges[gaugeIndex];
        if (!wallet || !gauge) return;

        if (result.status === "success") {
          const nftIds = result.result as bigint[];
          if (nftIds.length > 0) {
            console.log(
              `Found ${nftIds.length} staked NFTs for wallet ${wallet} in gauge ${gauge}`
            );
            results.push({ wallet, gauge, nftIds });
          }
        } else {
          console.warn(
            `Failed to get staked NFTs for wallet ${wallet} in gauge ${gauge}:`,
            result.error
          );
        }
      });
    }

    return results;
  }
}
