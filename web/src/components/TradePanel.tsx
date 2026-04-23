"use client";

import { useState } from "react";

export default function TradePanel() {
  const [amount, setAmount] = useState(10);
  const [expiry, setExpiry] = useState(60); // seconds

  const handleTrade = (type: "Call" | "Put") => {
    console.log(`Executing ${type} trade for $${amount} expiring in ${expiry}s`);
    // Here we will integrate the Soroban smart contract call to lock funds
    // and notify the backend about the trade.
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-2xl w-full max-w-sm h-full">
      <h2 className="text-xl font-semibold text-white">Place Trade</h2>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Amount (XLM)</label>
        <div className="flex bg-gray-800/80 rounded-xl overflow-hidden border border-gray-700 focus-within:border-emerald-500 transition-colors">
          <span className="p-3 text-gray-400 pl-4">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-transparent w-full p-3 pl-1 text-white outline-none font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Time (Seconds)</label>
        <div className="flex gap-2">
          {[15, 30, 60, 300].map((t) => (
            <button
              key={t}
              onClick={() => setExpiry(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                expiry === t
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <button
          onClick={() => handleTrade("Call")}
          className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
          CALL
        </button>

        <button
          onClick={() => handleTrade("Put")}
          className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 -translate-y-full group-hover:translate-y-0 transition-transform" />
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          PUT
        </button>
      </div>
    </div>
  );
}
