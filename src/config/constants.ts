import { Address } from "viem";

import "dotenv/config";

export const WALLET_ADDRESSES: Address[] = (
  process.env.WALLET_ADDRESSES?.split(",") || []
)
  .map((address) => address.trim())
  .filter((address): address is Address => {
    return typeof address === "string" && address.startsWith("0x");
  });

export const MULTICALL_CHUNK_SIZE = 100;

export const SLEEP_TIME = 1000;

export const Q96 = 2n ** 96n;

export const LST_CONTRACTS = {
  LIDO: {
    WSTETH: {
      address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      abi: ["function stEthPerToken() view returns (uint256)"],
    },
  },
  ROCKETPOOL: {
    RETH: {
      address: "0xae78736Cd615f374D3085123A210448E74Fc6393",
      abi: ["function getExchangeRate() view returns (uint256)"],
    },
  },
  ETHERFI: {
    WEETH: {
      address: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
      abi: ["function getRate() view returns (uint256)"],
    },
  },
  RENZO: {
    EZETH: {
      address: "0x387dBc0fB00b26fb085aa658527D5BE98302c84C",
      abi: ["function getRate() view returns (uint256)"],
    },
  },
  COINBASE: {
    CBETH: {
      address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
      abi: ["function exchangeRate() view returns (uint256)"],
    },
  },
  KELPDAO: {
    RSETH: {
      address: "0x1373A61449C26CC3F48C1B4c547322eDAa36eB12",
      abi: ["function getRate() view returns (uint256)"],
    },
  },
} as const;
