import { arbitrum } from "viem/chains";
import { NftService } from "../services/nftService";
import { Address } from "viem";

async function main() {
  // Configuration
  const chain = arbitrum;
  const wallet = "0x447Fe8022B18cbEbF09f9D2cD02140a13Bf1DCC9" as Address;
  const dex = "camelot";

  // Initialize service
  const nftService = new NftService(chain);

  try {
    // Get NFT balances
    console.log(`Checking NFT balances for:\nWallet: ${wallet}\nDEX: ${dex}\nChain: ${chain.name}`);
    const balances = await nftService.getNftBalances([wallet]);
    
    // Log results
    console.log("\nResults:");
    balances.forEach(balance => {
      console.log(`\nDEX: ${balance.dex}`);
      console.log(`Token IDs: ${balance.tokenIds.join(", ") || "None"}`);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
