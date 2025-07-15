import { Chain, Address } from "viem";
import { normalizeChainName } from "../utils/chain";
import { contractAddresses } from "../config/contractAddresses";
import { abis } from "../config/abis";
import { ChainName, DexType, PoolGauge, PoolData } from "../types";
import { sleep } from "../utils/sleep";
import { chunkArray } from "../utils/utils";
import { MULTICALL_CHUNK_SIZE } from "../config/constants";
import { BlockchainService } from "./blockchainService";
import { readCsv, writeCsv } from "../utils/csv";
import * as path from "path";
import { SLEEP_TIME } from "../config/constants";

export class PoolGaugeService {
  private blockchainService: BlockchainService;
  private csvPath: string;

  constructor(private readonly chain: Chain, private readonly dex: DexType) {
    const chainName = this.normalizeChainName(chain.name);
    const factoryAddress = contractAddresses[dex]?.[chainName]?.Factory;

    if (!factoryAddress) {
      throw new Error(`No ${dex} factory address found for chain ${chainName}`);
    }

    this.blockchainService = new BlockchainService(chain);
    this.csvPath = path.resolve(
      process.cwd(),
      "data",
      `${dex}-${chainName}-pools.csv`
    );
  }

  private normalizeChainName(chainName: string): ChainName {
    return normalizeChainName(chainName);
  }

  private getFactoryAddress(): Address {
    const chainName = this.normalizeChainName(this.chain.name);
    const factoryAddress = contractAddresses[this.dex]?.[chainName]?.Factory;
    if (!factoryAddress) {
      throw new Error(
        `No ${this.dex} factory address found for chain ${chainName}`
      );
    }
    return factoryAddress;
  }

  private getFactoryAbi() {
    return abis[this.dex].Factory;
  }

  private getPoolAbi() {
    return abis[this.dex].Pool;
  }

  async getAllPoolsWithGauges(): Promise<PoolGauge[]> {
    try {
      // Read existing data from CSV
      const existingData = await readCsv(this.csvPath);
      console.log(`Loaded ${existingData.size} entries from CSV`);

      // Get total number of pools
      const poolLength = (
        await this.blockchainService.multicall([
          {
            address: this.getFactoryAddress(),
            abi: this.getFactoryAbi(),
            functionName: "allPoolsLength",
            args: [],
          },
        ])
      )[0].result as bigint;
      await sleep(SLEEP_TIME);

      console.log(`Total number of pools: ${poolLength}`);

      // Create array of indices to fetch (only those we don't have)
      const indices = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).filter((index) => !existingData.has(index));

      console.log(`Need to fetch ${indices.length} new pools`);

      // Create multicall chunks for fetching new pools
      const poolData: PoolData[] = [...existingData.values()];
      if (indices.length > 0) {
        const poolChunks = chunkArray(
          indices.map((index) => ({
            address: this.getFactoryAddress(),
            abi: this.getFactoryAbi(),
            functionName: "allPools",
            args: [BigInt(index)] as const,
          })),
          MULTICALL_CHUNK_SIZE
        );

        // Get new pools using multicall chunks
        for (let chunkIndex = 0; chunkIndex < poolChunks.length; chunkIndex++) {
          const chunk = poolChunks[chunkIndex];
          const results = await this.blockchainService.multicall(chunk);
          await sleep(SLEEP_TIME);

          results.forEach((result, j) => {
            const originalIndex =
              indices[chunkIndex * MULTICALL_CHUNK_SIZE + j];
            if (originalIndex === undefined) return;

            if (result.status === "success") {
              const pool = result.result as Address;
              console.log(
                `Fetched new pool ${pool} for index ${originalIndex}`
              );
              poolData.push({
                index: originalIndex,
                pool,
                gauge: "0x0000000000000000000000000000000000000000" as Address,
                gaugeFetched: false, // Mark as not fetched yet
                dex: this.dex,
                chain: this.chain,
              });
            }
          });
        }

        // Save updated pool data
        await writeCsv(this.csvPath, poolData);
      }

      // Find pools that need gauge fetching (only those not yet fetched)
      const poolsNeedingGauge = poolData.filter((data) => !data.gaugeFetched);

      console.log(`Need to fetch gauges for ${poolsNeedingGauge.length} pools`);

      // Create multicall chunks for fetching missing gauges
      if (poolsNeedingGauge.length > 0) {
        const gaugeChunks = chunkArray(
          poolsNeedingGauge.map(({ pool }) => ({
            address: pool,
            abi: this.getPoolAbi(),
            functionName: "gauge",
            args: [] as const,
          })),
          MULTICALL_CHUNK_SIZE
        );

        // Get missing gauges using multicall chunks
        for (let i = 0; i < gaugeChunks.length; i++) {
          const chunk = gaugeChunks[i];
          const results = await this.blockchainService.multicall(chunk);
          await sleep(SLEEP_TIME);

          results.forEach((result, j) => {
            const poolData = poolsNeedingGauge[i * MULTICALL_CHUNK_SIZE + j];
            if (!poolData) return;

            if (result.status === "success") {
              const gauge = result.result as Address;
              console.log(`Fetched gauge ${gauge} for pool ${poolData.pool}`);
              poolData.gauge = gauge;
              poolData.gaugeFetched = true; // Mark as fetched
            } else {
              console.warn(
                `Failed to get gauge for pool ${poolData.pool}:`,
                result.error
              );
              poolData.gaugeFetched = true; // Mark as fetched even if failed
            }
          });
        }

        // Save updated pool data with new gauges
        await writeCsv(this.csvPath, poolData);
      }

      // Convert pool data to PoolGauge[] format and filter out pools without gauges
      return poolData
        .map(({ pool, gauge, dex, chain }) => ({ pool, gauge, dex, chain }))
        .filter(
          (pg: PoolGauge) =>
            pg.gauge !==
            ("0x0000000000000000000000000000000000000000" as Address)
        );
    } catch (error) {
      console.error("Error getting pools and gauges:", error);
      throw error;
    }
  }
}
