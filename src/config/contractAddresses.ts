import { ContractAddresses } from "../types";

export const contractAddresses: ContractAddresses = {
  uniswap: {
    mainnet: {
      NonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    },
    base: {
      NonfungiblePositionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
      Factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    },
    arbitrum: {
      NonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    },
    optimism: {
      NonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    },
    bsc: {
      NonfungiblePositionManager: "0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613",
      Factory: "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
    },
  },
  aerodrome: {
    base: {
      NonfungiblePositionManager: "0x827922686190790b37229fd06084350e74485b72",
      Factory: "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A", // CLFactory
    },
  },
  velodrome: {
    optimism: {
      NonfungiblePositionManager: "0x416b433906b1b72fa758e166e239c43d68dc6f29", // old: 0xbb5dfe1380333cee4c2eebd7202c80de2256adf4
      Factory: "0xcc0bddb707055e04e497ab22a59c2af4391cd12f", // CLFactory
    },
  },
  pancakeswap: {
    mainnet: {
      NonfungiblePositionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364", // TO GET THE POSITION
      MasterChefV3: "0x556B9306565093C855AEA9AE92A594704c2Cd59e", // TO GET THE OWNER OF THE NFT
      Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    },
    base: {
      NonfungiblePositionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
      MasterChefV3: "0xC6A2Db661D5a5690172d8eB0a7DEA2d3008665A3",
      Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    },
    arbitrum: {
      NonfungiblePositionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
      MasterChefV3: "0x5e09ACf80C0296740eC5d6F643005a4ef8DaA694",
      Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    },
    bsc: {
      NonfungiblePositionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
      MasterChefV3: "0x556B9306565093C855AEA9AE92A594704c2Cd59e",
      Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    },
  },
  camelot: {
    arbitrum: {
      NonfungiblePositionManager: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
      Factory: "0x1a3c9B1d2F0529D97f2afC5136Cc23e58f1FD35B",
    },
  },
} as const;
