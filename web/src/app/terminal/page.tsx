"use client";

import { useState } from "react";
import TradingChart from "@/components/TradingChart";
import TradePanel from "@/components/TradePanel";
import WalletConnect from "@/components/WalletConnect";
import SignOutButton from "@/components/SignOutButton";
import MarketStatsBar from "@/components/MarketStatsBar";
import Leaderboard from "@/components/Leaderboard";

type Symbol = "BTCUSDT" | "ETHUSDT" | "XLMUSDT";
const CHART_SYMBOLS: Record<Symbol, string> = {
  BTCUSDT: "BINANCE:BTCUSDT",
  ETHUSDT: "BINANCE:ETHUSDT",
  XLMUSDT: "BINANCE:XLMUSDT",
};

export default function TerminalPage() {
  const [symbol, setSymbol] = useState<Symbol>("BTCUSDT");
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <main className="flex flex-col h-screen w-screen bg-[#0a0a0c] text-white overflow-hidden selection:bg-emerald-500/30">

      {/* ── Header ── */}
      <header className="shrink-0 h-14 border-b border-gray-800/60 bg-black/40 backdrop-blur-md z-50 flex items-center px-4 sm:px-6 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Traderm
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile trade toggle */}
          <button
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {panelOpen ? "Chart" : "Trade"}
          </button>
          <WalletConnect />
          <SignOutButton />
        </div>
      </header>

      {/* ── Market Stats Bar ── */}
      <MarketStatsBar symbol={symbol} />

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        <Leaderboard />

        {/* Chart — hidden on mobile when panel open */}
        <div className={`flex-1 relative min-w-0 ${panelOpen ? "hidden lg:flex" : "flex"} flex-col`}>
          <div className="flex-1 relative min-h-0">
            <TradingChart symbol={CHART_SYMBOLS[symbol]} />
          </div>
          
          {/* Mobile positions button */}
          <div className="lg:hidden p-3 border-t border-gray-800/60 bg-[#0d0d12]">
            <button
              onClick={() => setPanelOpen(true)}
              className="w-full py-3 rounded-xl bg-gray-800/80 text-gray-300 border border-gray-700 font-medium text-sm hover:bg-gray-700 transition-colors"
            >
              Positions / Trade History
            </button>
          </div>
        </div>

        {/* Trade Panel — bottom sheet on mobile, sidebar on desktop */}
        <div className={`
          ${panelOpen ? "flex" : "hidden lg:flex"}
          flex-col
          w-full lg:w-[340px] xl:w-[360px]
          border-t lg:border-t-0 lg:border-l border-gray-800/60
          bg-[#0d0d12]
          overflow-y-auto
        `}>
          <div className="p-3 sm:p-4 flex-1">
            <TradePanel symbol={symbol} onSymbolChange={setSymbol} />
          </div>
        </div>
      </div>
    </main>
  );
}
