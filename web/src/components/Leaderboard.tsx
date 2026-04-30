"use client";

import { useState } from "react";

const MOCK_LEADERBOARD = [
  { address: "GD7P...8J2K", profit: 1420.50, winRate: 88, trades: 124 },
  { address: "GBAL...R9M1", profit: 980.20, winRate: 75, trades: 89 },
  { address: "GCS3...L0P4", profit: 750.15, winRate: 82, trades: 110 },
  { address: "GDOQ...Z3X9", profit: 640.80, winRate: 68, trades: 72 },
  { address: "GCY7...K2W1", profit: 510.40, winRate: 71, trades: 65 },
];

const MOCK_RECENT_TRADES = [
  { asset: "BTC", type: "CALL", amount: 50, result: "won", time: "2m ago" },
  { asset: "ETH", type: "PUT", amount: 25, result: "lost", time: "5m ago" },
  { asset: "XLM", type: "CALL", amount: 100, result: "won", time: "8m ago" },
  { asset: "BTC", type: "PUT", amount: 10, result: "won", time: "12m ago" },
  { asset: "ETH", type: "CALL", amount: 50, result: "lost", time: "15m ago" },
];

export default function Leaderboard() {
  const [tab, setTab] = useState<"recent" | "top">("recent");

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] border-l border-gray-800/60 w-[300px] hidden xl:flex">
      <div className="flex border-b border-gray-800/60 p-1 m-3 bg-gray-900/50 rounded-xl">
        <button
          onClick={() => setTab("recent")}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            tab === "recent" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setTab("top")}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            tab === "top" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Leaderboard
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {tab === "recent" ? (
          <div className="flex flex-col gap-3">
            {MOCK_RECENT_TRADES.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-8 rounded-full ${t.result === "won" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">{t.asset}/USDT</span>
                    <span className={`text-[10px] font-bold ${t.type === "CALL" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.type} • ${t.amount}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 font-medium">{t.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_LEADERBOARD.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="w-6 h-6 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-300 truncate">{u.address}</span>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{u.trades} trades</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span className="text-emerald-500/80">{u.winRate}% WR</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400">+${u.profit.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800/60">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Weekly Prize Pool</span>
            <span className="text-sm font-bold text-white">5,000 XLM</span>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-400 transition-colors">
            JOIN
          </button>
        </div>
      </div>
    </div>
  );
}
