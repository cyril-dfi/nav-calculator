import { BlockchainService } from "./blockchainService";
import { mainnet, optimism } from "viem/chains";
import { LST_CONTRACTS } from "../config/constants";
import { type Abi, parseAbi } from "viem";

export class LSTPricesService {
  private ethereumService: BlockchainService;
  private optimismService: BlockchainService;

  constructor() {
    this.ethereumService = new BlockchainService(mainnet);
    this.optimismService = new BlockchainService(optimism);
  }

  async getRedeemPrice(tokenSymbol: string): Promise<number> {
    let blockchainService: BlockchainService;
    let contractAddress: string;
    let contractAbi: Abi;
    let method: string;

    switch (tokenSymbol.toUpperCase()) {
      case "WSTETH":
        blockchainService = this.ethereumService;
        contractAddress = LST_CONTRACTS.LIDO.WSTETH.address;
        contractAbi = parseAbi(LST_CONTRACTS.LIDO.WSTETH.abi);
        method = "stEthPerToken";
        break;
      case "RETH":
        blockchainService = this.optimismService;
        contractAddress = LST_CONTRACTS.ROCKETPOOL.RETH.address;
        contractAbi = parseAbi(LST_CONTRACTS.ROCKETPOOL.RETH.abi);
        method = "getExchangeRate";
        break;
      case "WEETH":
        blockchainService = this.ethereumService;
        contractAddress = LST_CONTRACTS.ETHERFI.WEETH.address;
        contractAbi = parseAbi(LST_CONTRACTS.ETHERFI.WEETH.abi);
        method = "getRate";
        break;
      case "EZETH":
        blockchainService = this.ethereumService;
        contractAddress = LST_CONTRACTS.RENZO.EZETH.address;
        contractAbi = parseAbi(LST_CONTRACTS.RENZO.EZETH.abi);
        method = "getRate";
        break;
      case "CBETH":
        blockchainService = this.ethereumService;
        contractAddress = LST_CONTRACTS.COINBASE.CBETH.address;
        contractAbi = parseAbi(LST_CONTRACTS.COINBASE.CBETH.abi);
        method = "exchangeRate";
        break;
      case "RSETH":
      case "WRSETH":
        blockchainService = this.optimismService;
        contractAddress = LST_CONTRACTS.KELPDAO.RSETH.address;
        contractAbi = parseAbi(LST_CONTRACTS.KELPDAO.RSETH.abi);
        method = "getRate";
        break;
      default:
        throw new Error(`Unsupported token: ${tokenSymbol}`);
    }

    try {
      const result = await blockchainService.multicall([
        {
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          functionName: method,
          args: [],
        },
      ]);
      return Number(result[0].result) / 1e18;
    } catch (error) {
      console.error(`Error fetching redeem price for ${tokenSymbol}:`, error);
      throw error;
    }
  }

  async getRedeemPrices(tokens: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    for (const token of tokens) {
      if (token !== "WETH") {
        prices[token] = await this.getRedeemPrice(token);
      } else {
        prices[token] = 1; // WETH is 1:1 with ETH
      }
    }

    return prices;
  }
}
