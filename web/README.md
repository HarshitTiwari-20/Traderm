This is a [Next.js](https://nextjs.org) project for **Traderm** - a decentralized trading platform built on the Stellar blockchain.

## Features

- **Wallet Connection**: Connect your Freighter wallet to access trading features
- **Disconnect Functionality**: Safely disconnect your wallet with a dedicated disconnect button
- **Trading Interface**: Real-time trading charts and order panels
- **Stellar Integration**: Seamless integration with Stellar blockchain

## Getting Started

First, ensure you have the required dependencies installed:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Components

### WalletConnect
- Manages Freighter wallet connection and disconnection
- Displays connected wallet address
- Provides visual feedback with status indicators
- Automatically checks for previously connected wallets on load

### TradingChart
- Real-time trading chart visualization
- Market data display

### TradePanel
- Trading order interface
- Buy/Sell functionality

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Stellar Documentation](https://developers.stellar.org/) - learn about Stellar blockchain
- [Freighter Wallet](https://www.freighter.app/) - the wallet used for Stellar transactions

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── WalletConnect.tsx     # Wallet connection & disconnection
│   ├── TradingChart.tsx      # Chart visualization
│   ├── TradePanel.tsx        # Trading interface
│   └── ...
└── ...
```

## Configuration

- **Prisma**: Database ORM configured in `prisma.config.ts`
- **TypeScript**: Full type safety with `tsconfig.json`
- **ESLint**: Code linting with `eslint.config.mjs`
- **PostCSS**: CSS processing with `postcss.config.mjs`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
