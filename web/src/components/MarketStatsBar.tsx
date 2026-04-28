"use client";

import { useState, useEffect } from "react";

interface Ticker {
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
}

export const SYMBOLS = ["BTCUSDT", "ETHUSDT", "XLMUSDT"] as const;
type Symbol = typeof SYMBOLS[number];

const WS_STREAMS: Record<Symbol, string> = {
  BTCUSDT: "btcusdt@ticker",
  ETHUSDT: "ethusdt@ticker",
  XLMUSDT: "xlmusdt@ticker",
};

export default function MarketStatsBar({ symbol }: { symbol: Symbol }) {
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${WS_STREAMS[symbol]}`
    );
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        setTicker({
          price: parseFloat(d.c),
          change: parseFloat(d.p),
          changePct: parseFloat(d.P),
          high: parseFloat(d.h),
          low: parseFloat(d.l),
          volume: parseFloat(d.v),
        });
      } catch {}
    };
    return () => ws.close();
  }, [symbol]);

  const positive = (ticker?.changePct ?? 0) >= 0;
  const fmtPrice = (n: number, decimals = 2) =>
    n >= 1000
      ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n.toFixed(decimals > 4 ? 4 : decimals);

  const displaySymbol = symbol.replace("USDT", "/USDT");

  return (
    <div className="flex items-center gap-4 sm:gap-6 px-4 py-2.5 bg-[#0a0a0e] border-b border-gray-800/60 overflow-x-auto scrollbar-hide text-xs sm:text-sm whitespace-nowrap">
      {/* Symbol + price */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-white text-sm sm:text-base">{displaySymbol}</span>
        {ticker ? (
          <span className={`font-mono font-semibold text-base ${positive ? "text-emerald-400" : "text-red-400"}`}>
            ${fmtPrice(ticker.price)}
          </span>
        ) : (
          <span className="font-mono text-gray-600 animate-pulse">—</span>
        )}
      </div>

      <div className="w-px h-5 bg-gray-800 shrink-0" />

      {/* 24h Change */}
      {ticker && (
        <>
          <div className="flex flex-col shrink-0">
            <span className="text-gray-600 text-[10px] uppercase tracking-wider">24h Change</span>
            <span className={`font-mono font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {positive ? "+" : ""}{ticker.changePct.toFixed(2)}%
            </span>
          </div>

          <div className="flex flex-col shrink-0">
            <span className="text-gray-600 text-[10px] uppercase tracking-wider">24h High</span>
            <span className="font-mono text-gray-300">${fmtPrice(ticker.high)}</span>
          </div>

          <div className="flex flex-col shrink-0">
            <span className="text-gray-600 text-[10px] uppercase tracking-wider">24h Low</span>
            <span className="font-mono text-gray-300">${fmtPrice(ticker.low)}</span>
          </div>

          <div className="flex flex-col shrink-0">
            <span className="text-gray-600 text-[10px] uppercase tracking-wider">Volume</span>
            <span className="font-mono text-gray-300">
              {ticker.volume >= 1000
                ? `${(ticker.volume / 1000).toFixed(1)}K`
                : ticker.volume.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
