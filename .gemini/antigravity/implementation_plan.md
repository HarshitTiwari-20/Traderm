# Goal Description

Implement the extensive set of UI/UX features requested for the fixed-time trading terminal. This includes replacing the chart widget with lightweight-charts, adding countdown timers, quick trade amounts, recent trades, leaderboards, stats cards, skeleton loaders, and a footer. It also involves enhancing the Soroban smart contract with an emergency pause function, input validation, reentrancy guards, events, and preparing it for Reflector Oracle TWAP prices.

## User Review Required

> [!IMPORTANT]
> **Reflector Oracle Integration**: Since a live Reflector Oracle requires a specific network deployment address and an imported interface, I will rename the oracle variables to emphasize TWAP and structure the settlement function to accept a `twap_price`. For a full on-chain integration, we would need the actual Reflector Oracle contract ID on Testnet/Mainnet to call its `lastprice` function directly. For now, it will remain as an Oracle-pushed settlement using a TWAP price.

> [!NOTE]
> **Leaderboard & Recent Trades**: Without a centralized backend to aggregate all global trades, the leaderboard and recent trades will be simulated using mock data or local storage for demonstration purposes. 

## Open Questions

None at this time.

## Proposed Changes

### Smart Contract (`contracts/src/lib.rs`)

Summary of changes to the Soroban contract:
- **Admin Pause**: Add `admin` and `is_paused` to the storage. Implement `admin_pause(env, admin, pause)` to halt `open_trade` in emergencies.
- **Validation**: Ensure `amount > 0` and `expiry_time > env.ledger().timestamp()`.
- **Reentrancy Guards**: Update trade status in storage *before* transferring any funds during `settle_trade`.
- **Events**: Publish events `("trade", "opened")`, `("trade", "settled")`, and `("trade", "payout")`.
- **TWAP**: Rename `settlement_price` to `twap_price` to reflect Reflector TWAP standards.

#### [MODIFY] [lib.rs](file:///home/harshit/Desktop/projects/stellar-green-belt/contracts/src/lib.rs)

---

### Web Frontend (`web`)

Summary of changes to the React frontend:

#### [MODIFY] [TradingChart.tsx](file:///home/harshit/Desktop/projects/stellar-green-belt/web/src/components/TradingChart.tsx)
- Replace `react-ts-tradingview-widgets` iframe with `lightweight-charts` to provide a fast, native real-time candlestick chart.

#### [MODIFY] [TradePanel.tsx](file:///home/harshit/Desktop/projects/stellar-green-belt/web/src/components/TradePanel.tsx)
- Add quick amount buttons ($10, $25, $50, $100).
- Update the UP/DOWN buttons to clearly display the expected payout amount on the button itself.
- Add toast notifications (using `react-hot-toast`) for when trades are placed, won, or lost.
- Add skeleton loaders for balances and prices while fetching.
- Add proper empty states for the active trades and history tabs.
- Ensure the UI is fully responsive on mobile.

#### [MODIFY] [page.tsx](file:///home/harshit/Desktop/projects/stellar-green-belt/web/src/app/page.tsx)
- Add a footer with links to Docs, Twitter, Discord, Terms, and Privacy Policy.

#### [NEW] [Leaderboard.tsx](file:///home/harshit/Desktop/projects/stellar-green-belt/web/src/components/Leaderboard.tsx)
- Create a new component for the Leaderboard and Recent Trades panel, showing top traders by profit and the last 10 global trades.

#### [MODIFY] [terminal/page.tsx](file:///home/harshit/Desktop/projects/stellar-green-belt/web/src/app/terminal/page.tsx)
- Integrate the new `Leaderboard` component.
- Improve layout for mobile responsiveness (sidebar vs bottom sheet).

#### [MODIFY] [globals.css](file:///home/harshit/Desktop/projects/stellar-green-belt/web/src/app/globals.css)
- Ensure dark mode is the default and only mode by removing light mode styles and enforcing standard dark themes.

## Verification Plan

### Automated Tests
- Build the Soroban contract using `cargo build --target wasm32-unknown-unknown --release` to ensure no syntax or logic errors in the new contract code.
- Build the Next.js frontend using `pnpm run build` to ensure the new components and chart integrate properly without TypeScript errors.

### Manual Verification
- Verify the new lightweight chart renders properly and updates with real-time price data.
- Confirm quick amount buttons correctly set the input field.
- Verify UP/DOWN buttons display the payout and trigger the toast notifications upon interaction.
- Check the mobile layout by simulating a phone viewport.
- Confirm the presence of the footer on the homepage.
