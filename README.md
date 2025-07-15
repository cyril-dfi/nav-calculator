# DeFi NAV Calculator

A TypeScript application that calculates Net Asset Value (NAV) for DeFi positions across multiple blockchain networks and DEXes.

## Features

- Multi-chain support:
  - Ethereum Mainnet
  - Base
  - Optimism
  - Arbitrum
  - BSC (Binance Smart Chain)
- DEX integrations:
  - Uniswap V3 (Mainnet, Base, Optimism, Arbitrum, BSC)
  - Aerodrome (Base)
  - Velodrome (Optimism)
  - PancakeSwap (Mainnet, Base, Arbitrum, BSC)
  - Camelot (Arbitrum)
- Comprehensive position tracking:
  - NFT positions
  - Staked NFTs
  - Pool gauges
  - Liquidity positions

## Prerequisites

- Node.js installed on your system
- Access to RPC endpoints for supported networks

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` with your configuration:

   ```env
   # Wallet addresses (comma-separated)
   WALLET_ADDRESSES=0x123...,0x456...

   # RPC URLs
   MAINNET_RPC_URL=your_mainnet_rpc_url
   BASE_RPC_URL=your_base_rpc_url
   OPTIMISM_RPC_URL=your_optimism_rpc_url
   ARBITRUM_RPC_URL=your_arbitrum_rpc_url
   BSC_RPC_URL=your_bsc_rpc_url
   ```

## Usage

For development:

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

The application will:

1. Fetch pools with gauges across configured DEXes
2. Get NFT positions for all supported chains and DEXes
3. Calculate the NAV for each position
4. Output comprehensive NAV results
