import { Address, Chain } from "viem";
import { base, optimism, arbitrum, bsc } from "viem/chains";
import { PoolData, DexType } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export async function readCsv(
  filePath: string
): Promise<Map<number, PoolData>> {
  const data = new Map<number, PoolData>();
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    // Extract dex and chain from filename
    const filename = path.basename(filePath);
    const [dex, chainName] = filename.split("-");

    // Set chain based on filename
    // Get chain from viem's predefined chain objects
    let chain: Chain;
    if (chainName?.startsWith("optimism")) {
      chain = optimism;
    } else if (chainName?.startsWith("base")) {
      chain = base;
    } else if (chainName?.startsWith("arbitrum")) {
      chain = arbitrum;
    } else if (chainName?.startsWith("bsc")) {
      chain = bsc;
    } else {
      throw new Error(`Unsupported chain in filename: ${chainName}`);
    }

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [index, pool, gauge] = line.split(",");
      if (index && pool && gauge) {
        const [gaugeAddress, gaugeFetched] = gauge.split("|");
        data.set(Number(index), {
          index: Number(index),
          pool: pool as Address,
          gauge: gaugeAddress as Address,
          gaugeFetched: gaugeFetched === "1",
          dex: dex as DexType,
          chain,
        });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  return data;
}

export async function writeCsv(
  filePath: string,
  data: PoolData[]
): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const content = ["index,pool,gauge"];
  for (const item of data) {
    content.push(
      `${item.index},${item.pool},${item.gauge}|${
        item.gaugeFetched ? "1" : "0"
      }`
    );
  }
  await fs.writeFile(filePath, content.join("\n"));
}
