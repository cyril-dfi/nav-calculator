import { Address, Chain } from "viem";
import { BlockchainService } from "./blockchainService";
import * as fs from "fs/promises";
import * as path from "path";
import { sleep } from "../utils/sleep";
import { SLEEP_TIME, MULTICALL_CHUNK_SIZE } from "../config/constants";
import { chunkArray } from "../utils/utils";

interface TokenInfo {
  address: string;
  chain: string;
  symbol: string;
  decimals: number;
}

const ERC20_ABI = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class TokenService {
  private blockchainService: BlockchainService;
  private csvPath: string;
  private tokenCache: Map<string, TokenInfo>;
  private chain: Chain;

  constructor(chain: Chain) {
    this.blockchainService = new BlockchainService(chain);
    this.chain = chain;
    this.csvPath = path.resolve(process.cwd(), "data", "tokens.csv");
    this.tokenCache = new Map();
  }

  private getTokenKey(chain: string, address: string): string {
    return `${chain}:${address.toLowerCase()}`;
  }

  async loadTokenCache(): Promise<void> {
    try {
      const content = await fs.readFile(this.csvPath, "utf-8");
      const lines = content.split("\n");

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [address, chain, symbol, decimals] = line.split(",");
        if (address && chain && symbol && decimals) {
          const key = this.getTokenKey(chain, address);
          this.tokenCache.set(key, {
            address,
            chain,
            symbol,
            decimals: parseInt(decimals),
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      // Initialize empty cache if file doesn't exist
      this.tokenCache = new Map();
    }
  }

  private async saveTokenCache(): Promise<void> {
    await fs.mkdir(path.dirname(this.csvPath), { recursive: true });
    const content = ["address,chain,symbol,decimals"];
    for (const info of this.tokenCache.values()) {
      content.push(
        `${info.address},${info.chain},${info.symbol},${info.decimals}`
      );
    }
    await fs.writeFile(this.csvPath, content.join("\n"));
  }

  async getTokenInfo(
    addresses: Address[]
  ): Promise<Map<string, { symbol: string; decimals: number }>> {
    await this.loadTokenCache();

    const result = new Map<string, { symbol: string; decimals: number }>();
    const uncachedAddresses: Address[] = [];

    // Check cache first
    for (const address of addresses) {
      const key = this.getTokenKey(this.chain.name, address);
      const cached = this.tokenCache.get(key);
      if (cached) {
        result.set(address, {
          symbol: cached.symbol,
          decimals: cached.decimals,
        });
      } else {
        uncachedAddresses.push(address);
      }
    }

    if (uncachedAddresses.length > 0) {
      const chunks = chunkArray(uncachedAddresses, MULTICALL_CHUNK_SIZE);

      for (const chunk of chunks) {
        const symbolCalls = chunk.map((address) => ({
          address,
          abi: ERC20_ABI,
          functionName: "symbol",
          args: [],
        }));

        const decimalsCalls = chunk.map((address) => ({
          address,
          abi: ERC20_ABI,
          functionName: "decimals",
          args: [],
        }));

        const [symbolResults, decimalsResults] = await Promise.all([
          this.blockchainService.multicall(symbolCalls),
          this.blockchainService.multicall(decimalsCalls),
        ]);

        await sleep(SLEEP_TIME);

        for (let i = 0; i < chunk.length; i++) {
          const address = chunk[i];
          const symbolResult = symbolResults[i];
          const decimalsResult = decimalsResults[i];

          if (
            symbolResult.status === "success" &&
            decimalsResult.status === "success"
          ) {
            const symbol = symbolResult.result as string;
            const decimals = decimalsResult.result as number;

            // Update cache
            const key = this.getTokenKey(this.chain.name, address);
            this.tokenCache.set(key, {
              address,
              chain: this.chain.name,
              symbol,
              decimals,
            });

            // Update result
            result.set(address, { symbol, decimals });
          }
        }
      }

      // Save updated cache
      await this.saveTokenCache();
    }

    return result;
  }
}
