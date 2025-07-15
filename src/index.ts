import { mainnet, base, optimism, arbitrum, bsc } from "viem/chains";
import { WALLET_ADDRESSES } from "./config/constants";
import { Result, PositionResult, DexType } from "./types";
import { NftService } from "./services/nftService";
import { PositionService } from "./services/positionService";
import { PoolGaugeService } from "./services/poolGaugeService";
import { StakedNftService } from "./services/stakedNftService";

async function main() {
  const result: Result = {
    wallets: {},
  };

  // Get pools with gauges for each DEX/chain combination
  console.log("Getting pools with gauges for all DEX/chain combinations...");
  const dexChainCombos = [
    { chain: base, dex: "aerodrome" as const },
    { chain: optimism, dex: "velodrome" as const },
  ];

  const poolsWithGauges = [];
  for (const { chain, dex } of dexChainCombos) {
    console.log(`Getting ${dex} pools with gauges on ${chain.name}...`);
    const poolGaugeService = new PoolGaugeService(chain, dex);
    const pools = await poolGaugeService.getAllPoolsWithGauges();
    poolsWithGauges.push(...pools);
    console.log(
      `Found ${pools.length} pools with gauges for ${dex} on ${chain.name}`
    );
  }
  console.log(
    `Total pools with gauges across all DEXes: ${poolsWithGauges.length}`
  );

  // Get NFT positions for all chains
  console.log("Getting NFT positions...");
  const allPositions: PositionResult[] = [];

  // Track total values
  let totalWethValue = 0;
  let totalWbtcValue = 0;
  let totalStablecoinValue = 0;

  for (const chain of [mainnet, base, optimism, arbitrum, bsc]) {
    console.log(`Getting NFTs for ${chain.name}...`);
    const nftService = new NftService(chain);
    const nftBalances = await nftService.getNftBalances(WALLET_ADDRESSES);
    console.log(
      `Found NFT balances for ${nftBalances.length} wallet-dex combinations on ${chain.name}`
    );

    // Convert NFT balances to positions format
    let chainNftPositions = nftBalances.flatMap(({ wallet, dex, tokenIds }) =>
      tokenIds.map((tokenId) => ({ wallet, dex, tokenId }))
    );

    // Get staked NFTs for supported DEX/chain combinations
    const chainGauges = poolsWithGauges.filter(
      (pg) => pg.chain.id === chain.id
    );

    if (chainGauges.length > 0) {
      console.log(`Getting staked NFTs for ${chain.name}...`);
      const stakedNftService = new StakedNftService(chain);
      const stakedNfts = await stakedNftService.getStakedNfts(
        WALLET_ADDRESSES,
        chainGauges.map((pg) => pg.gauge)
      );
      console.log(`Found ${stakedNfts.length} staked NFT entries`);

      // Add staked NFT positions
      chainNftPositions = [
        ...chainNftPositions,
        ...stakedNfts.flatMap(({ wallet, gauge, nftIds }) => {
          const poolGauge = chainGauges.find((pg) => pg.gauge === gauge);
          if (!poolGauge) {
            console.warn(`Could not find pool gauge for gauge ${gauge}`);
            return [];
          }
          return nftIds.map((nftId: bigint) => ({
            wallet,
            dex: poolGauge.dex as DexType,
            tokenId: nftId.toString(),
          }));
        }),
      ];
    }

    if (chainNftPositions.length > 0) {
      console.log(
        `Getting position details for ${chainNftPositions.length} positions on ${chain.name}...`
      );
      const positionService = new PositionService(chain);
      const chainPositions = await positionService.getPositionDetails(
        chainNftPositions
      );
      console.log(`Found ${chainPositions.length} positions on ${chain.name}`);
      allPositions.push(...chainPositions);
    }
  }
  // Group and format positions by wallet, chain, and dex
  const positionsWithLiquidity = allPositions.filter(
    (pos) => pos.details.liquidity > 0n
  );

  interface GroupedPositions {
    [wallet: string]: {
      [dex: string]: PositionResult[];
    };
  }
  console.log(
    `Total positions found across all chains: ${positionsWithLiquidity.length}`
  );
  console.log("positionsWithLiquidity", positionsWithLiquidity);

  const groupedPositions = positionsWithLiquidity.reduce<GroupedPositions>(
    (acc, pos) => {
      if (!acc[pos.wallet]) acc[pos.wallet] = {};
      if (!acc[pos.wallet][pos.dex]) acc[pos.wallet][pos.dex] = [];
      acc[pos.wallet][pos.dex].push(pos);
      return acc;
    },
    {}
  );

  console.log("groupedPositions", groupedPositions);
  // Format and log the grouped positions
  Object.entries(groupedPositions).forEach(([wallet, dexes], walletIndex) => {
    console.log(`\nWallet ${walletIndex + 1} (${wallet})`);
    Object.entries(dexes).forEach(([dex, positions]) => {
      console.log(`  - ${dex}`);
      positions.forEach((pos) => {
        if (
          pos.details.token0Symbol &&
          pos.details.token1Symbol &&
          pos.details.token0Decimals &&
          pos.details.token1Decimals
        ) {
          const amount0 =
            Number(pos.details.amount0) /
            Math.pow(10, pos.details.token0Decimals);
          const amount1 =
            Number(pos.details.amount1) /
            Math.pow(10, pos.details.token1Decimals);
          // Determine base token
          let baseToken = "";
          let baseTokenAmount = 0;
          let baseTokenSymbol = "";

          // Check for LSTs first (WETH)
          if (pos.details.token0Symbol?.toUpperCase() === "WETH") {
            baseToken = "WETH";
            baseTokenAmount = amount0;
            baseTokenSymbol = pos.details.token0Symbol;
          } else if (pos.details.token1Symbol?.toUpperCase() === "WETH") {
            baseToken = "WETH";
            baseTokenAmount = amount1;
            baseTokenSymbol = pos.details.token1Symbol;
          }
          // Check for stables (USDC/USDT)
          else if (pos.details.token0Symbol?.toUpperCase() === "USDC") {
            baseToken = "USDC";
            baseTokenAmount = amount0;
            baseTokenSymbol = pos.details.token0Symbol;
          } else if (pos.details.token1Symbol?.toUpperCase() === "USDC") {
            baseToken = "USDC";
            baseTokenAmount = amount1;
            baseTokenSymbol = pos.details.token1Symbol;
          } else if (pos.details.token0Symbol?.toUpperCase() === "USDT") {
            baseToken = "USDT";
            baseTokenAmount = amount0;
            baseTokenSymbol = pos.details.token0Symbol;
          } else if (pos.details.token1Symbol?.toUpperCase() === "USDT") {
            baseToken = "USDT";
            baseTokenAmount = amount1;
            baseTokenSymbol = pos.details.token1Symbol;
          }
          // Check for BTC derivatives
          else if (pos.details.token0Symbol?.toUpperCase() === "WBTC") {
            baseToken = "WBTC";
            baseTokenAmount = amount0;
            baseTokenSymbol = pos.details.token0Symbol;
          } else if (pos.details.token1Symbol?.toUpperCase() === "WBTC") {
            baseToken = "WBTC";
            baseTokenAmount = amount1;
            baseTokenSymbol = pos.details.token1Symbol;
          }

          // Calculate NAV using navPrice
          let nav: number | undefined;
          if (pos.details.navPrice) {
            const token0Upper = pos.details.token0Symbol?.toUpperCase();
            const token1Upper = pos.details.token1Symbol?.toUpperCase();
            const stablecoins = ["USDC", "USDT"];

            if (token0Upper === "WETH" || token1Upper === "WETH") {
              // For WETH pairs, sum WETH amount + other token amount * navPrice (or inverse)
              nav =
                token0Upper === "WETH"
                  ? amount0 + amount1 * pos.details.navPrice
                  : amount1 + amount0 / pos.details.navPrice;
            } else if (token0Upper === "WBTC" || token1Upper === "WBTC") {
              // For WBTC pairs, similar to WETH
              nav =
                token0Upper === "WBTC"
                  ? amount0 + amount1 * pos.details.navPrice
                  : amount1 + amount0 / pos.details.navPrice;
            } else if (
              stablecoins.includes(token0Upper || "") ||
              stablecoins.includes(token1Upper || "")
            ) {
              // For stablecoin pairs, similar to WETH
              const isToken0Stable = stablecoins.includes(token0Upper || "");
              nav = isToken0Stable
                ? amount0 + amount1 * pos.details.navPrice
                : amount1 + amount0 / pos.details.navPrice;
            } else if (baseToken) {
              // For other pairs with base token
              nav =
                baseTokenAmount +
                (baseToken === token0Upper
                  ? amount1 * pos.details.navPrice
                  : amount0 / pos.details.navPrice);
            }
          }

          // Update totals based on baseToken and nav
          if (nav) {
            if (baseToken === "WETH") {
              totalWethValue += nav;
            } else if (baseToken === "WBTC") {
              totalWbtcValue += nav;
            } else if (["USDC", "USDT"].includes(baseToken || "")) {
              totalStablecoinValue += nav;
            }
          }

          console.log(
            `      - nftID ${pos.tokenId}: ${amount0.toFixed(4)} ${
              pos.details.token0Symbol
            } / ${amount1.toFixed(4)} ${pos.details.token1Symbol}` +
              (nav
                ? ` | NAV: ${nav.toFixed(4)} ${
                    baseToken || pos.details.token0Symbol
                  }`
                : "")
          );
        }
      });
    });
  });

  // Log total values
  console.log("\nTotal NAV across all wallets:");
  console.log(`Total WETH value: ${totalWethValue.toFixed(4)} WETH`);
  console.log(`Total WBTC value: ${totalWbtcValue.toFixed(4)} WBTC`);
  console.log(`Total Stablecoin value: ${totalStablecoinValue.toFixed(2)} USD`);
}

main().catch(console.error);
