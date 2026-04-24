# Stellar Green Belt

**Stellar Green Belt** is a full-stack project combining:
- a Soroban smart contract for fixed-time binary trading on Stellar
- a Rust WebSocket server for market data streaming
- a Next.js frontend for trading and wallet interaction

This repo is organized into three main folders:
- `contracts/` — Soroban smart contract written in Rust
- `server/` — Rust WebSocket server for market data broadcast
- `web/` — Next.js frontend with Freighter wallet integration

## Project Overview

Traderm is a decentralized trading interface built on Stellar's Soroban smart contracts. Traders can open prediction-style positions (Call/Put), lock token funds, and settle trades based on oracle prices.

### Key capabilities

- Wallet connection with Freighter
- Trade order UI with real-time charting
- Smart contract trade locking and settlement
- On-chain token transfer for deposits, refunds, and payouts

## Smart Contract Details

The contract lives in `contracts/src/lib.rs` and exposes the following entry points:

- `init(oracle: Address, token: Address)`
  - Initializes the contract with an oracle address and a token contract address
- `open_trade(user, asset, amount, entry_price, expiry_time, prediction)`
  - Locks funds by transferring tokens from the user to the contract vault
  - Stores the trade with status `Open`
- `settle_trade(oracle, trade_id, settlement_price)`
  - Can only be executed by the configured oracle
  - Settles trade outcome and either refunds, pays out, or keeps funds locked
- `get_trade(trade_id)`
  - Reads stored trade state from contract storage

### Contract addresses

- Testnet trading contract: `CADKQRPQ3BKQ6GZ3UQEDJAYM6ROHJEHPIQZG2N5ANGTOHTJ7ASUCN3DW`
- Mainnet trading contract: not yet configured in source (`MAINNET_CONTRACT_ID` is empty)

<img src="https://github.com/HarshitTiwari-20/Traderm/blob/main/web/public/txn_data.png" width="600" height="500" />
<img src="https://github.com/HarshitTiwari-20/Traderm/blob/main/web/public/on-chain-data.png" width="600" height="500" />
<img src="https://github.com/HarshitTiwari-20/Traderm/blob/main/web/public/balance.png" width="600" height="500" />

### Token / pool deployment

- The contract does not include a custom pool deployment.
- It relies on a token contract address provided during initialization.
- The token contract address is stored in contract state under `TOKEN`.

### Inter-contract activity

- The trading contract uses the standard Soroban token client to move funds between the user and the contract vault.
- This is the only external contract interaction in this repo; no dedicated pool contract is deployed here.

### Transaction hash

- No deploy or inter-contract transaction hashes are stored in this repository.
- If you deploy the contract or execute oracle settlement transactions, add the transaction hash here for reference.

## Server

The server is implemented in `server/` using Axum and exposes:
- a `GET /ws` WebSocket endpoint for broadcasting market updates
- a background Binance WebSocket client that relays market data to connected clients

Run the server with:

```bash
cd server
cargo run
```

It listens by default on `ws://0.0.0.0:8000/ws`.

## Here is the video recording of the project:
https://youtu.be/D-nap38FwOU 

## Frontend

The frontend is a Next.js app in `web/`.

### Local development

```bash
cd web
pnpm install
pnpm dev
```

Open `http://localhost:3000` to use the trading UI.

### Important environment variables

For local development and CI, configure:

- `DATABASE_URL` — PostgreSQL connection string used by Prisma
- `NEXTAUTH_SECRET` — secret for NextAuth session encryption

In GitHub Actions, these values should be stored as secrets and consumed through `secrets.DATABASE_URL` and `secrets.NEXTAUTH_SECRET`.

### Package manager

This repository currently uses `pnpm` and the lockfile is generated for `pnpm@9.x`.

## Build commands

### Build the smart contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

### Build the web app

```bash
cd web
pnpm install
pnpm build
```

### Run the WebSocket server

```bash
cd server
cargo run
```

## Repository structure

```
contracts/   # Soroban smart contract source and build files
server/      # Rust WebSocket server for market and websocket broadcast
web/         # Next.js frontend, Prisma config, and UI components
```

## Notes

- The current source code is configured for Stellar Testnet.
- The contract address above is the deployed testnet trading contract.
- The token address must be initialized separately and is not hard-coded in this repo.
- If you add support for a custom token or trading pool, record the deployed address here.

## Useful links

- [Stellar Soroban Docs](https://soroban.stellar.org)
- [Freighter Wallet](https://www.freighter.app)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
