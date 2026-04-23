"use client";

import { useState, useEffect } from "react";
import { isConnected, getAddress, isAllowed } from "@stellar/freighter-api";
import { Horizon } from "@stellar/stellar-sdk";

type TradeType = "Call" | "Put";

interface ActiveTrade {
  id: string;
  type: TradeType;
  amount: number;
  entryPrice: number;
  expiryTime: number; // Unix timestamp
  status: "active" | "won" | "lost" | "tie";
}

export default function TradePanel() {
  const [amount, setAmount] = useState<number>(0);
  const [expiry, setExpiry] = useState<number>(60); // seconds
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [trades, setTrades] = useState<ActiveTrade[]>([]);
  const PAYOUT_RATE = 0.82; // 82% profit on win

  // Fetch Available Balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (await isConnected() && await isAllowed()) {
          const keyObj = await getAddress();
          const pubKey = typeof keyObj === "string" ? keyObj : keyObj?.address;
          if (pubKey) {
            const server = new Horizon.Server("https://horizon-testnet.stellar.org");
            const account = await server.loadAccount(pubKey);
            const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
            if (nativeBalance) {
              // Only set initial balance or if it changes externally
              setAvailableBalance(parseFloat(nativeBalance.balance));
            }
          }
        } else {
          // Fallback mock balance for testing if wallet not connected
          setAvailableBalance(10000);
        }
      } catch (err) {
        console.error("Failed to fetch balance", err);
        setAvailableBalance(10000); // Mock balance fallback
      }
    };
    
    fetchBalance();
  }, []);

  // Fetch Live Price (Binance WS)
  useEffect(() => {
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@ticker");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.c) {
          setCurrentPrice(parseFloat(data.c));
        }
      } catch (err) {}
    };
    return () => ws.close();
  }, []);

  // Evaluate Trades loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTrades((prevTrades) => {
        return prevTrades.map((trade) => {
          if (trade.status !== "active") return trade;

          // Check if expired
          if (now >= trade.expiryTime) {
            let status: "won" | "lost" | "tie" = "lost";
            if (trade.type === "Call" && currentPrice > trade.entryPrice) status = "won";
            if (trade.type === "Put" && currentPrice < trade.entryPrice) status = "won";
            if (currentPrice === trade.entryPrice) status = "tie";

            // Settle funds locally
            if (status === "won") {
              setAvailableBalance((b) => b + trade.amount + (trade.amount * PAYOUT_RATE));
            } else if (status === "tie") {
              setAvailableBalance((b) => b + trade.amount); // return funds
            }

            return { ...trade, status };
          }
          return trade;
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPrice]);

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (availableBalance > 0) {
      setSliderValue((val / availableBalance) * 100);
    }
  };

  const handleSliderChange = (val: number) => {
    setSliderValue(val);
    setAmount(Number(((availableBalance * val) / 100).toFixed(2)));
  };

  const handleTrade = (type: TradeType) => {
    if (amount <= 0 || amount > availableBalance || currentPrice === 0) return;

    const newTrade: ActiveTrade = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      amount,
      entryPrice: currentPrice,
      expiryTime: Date.now() + expiry * 1000,
      status: "active",
    };

    // Lock funds locally
    setAvailableBalance((b) => b - amount);
    setTrades((prev) => [newTrade, ...prev]);
  };

  const calculateLivePnL = (trade: ActiveTrade) => {
    if (trade.status !== "active") return null;
    let isWinning = false;
    if (trade.type === "Call" && currentPrice > trade.entryPrice) isWinning = true;
    if (trade.type === "Put" && currentPrice < trade.entryPrice) isWinning = true;

    if (currentPrice === trade.entryPrice) return <span className="text-gray-400">$0.00</span>;
    return isWinning ? (
      <span className="text-emerald-500 font-bold">+{(trade.amount * PAYOUT_RATE).toFixed(2)}</span>
    ) : (
      <span className="text-red-500 font-bold">-{trade.amount.toFixed(2)}</span>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* Main Trading Panel */}
      <div className="flex flex-col gap-6 p-6 bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-2xl w-full max-w-sm shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Place Trade</h2>
          <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
            {PAYOUT_RATE * 100}% Payout
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-400">Amount (XLM)</label>
          <div className="flex bg-gray-800/80 rounded-xl overflow-hidden border border-gray-700 focus-within:border-emerald-500 transition-colors">
            <span className="p-3 text-gray-400 pl-4">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              className="bg-transparent w-full p-3 pl-1 text-white outline-none font-medium"
            />
          </div>

          {/* Allocation Slider & Balance */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-gray-400">Available</span>
              <span className="text-gray-200">{availableBalance.toFixed(2)} XLM</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="25" 
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            
            <div className="flex justify-between text-[10px] text-gray-500 px-1 mt-1 font-medium">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
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
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-500/50"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <button
            onClick={() => handleTrade("Call")}
            disabled={amount <= 0 || amount > availableBalance}
            className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            CALL
          </button>

          <button
            onClick={() => handleTrade("Put")}
            disabled={amount <= 0 || amount > availableBalance}
            className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500 hover:bg-red-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:shadow-none transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 -translate-y-full group-hover:translate-y-0 transition-transform" />
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            PUT
          </button>
        </div>
      </div>

      {/* Active Trades List */}
      <div className="flex flex-col gap-4 p-6 bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-2xl w-full max-w-sm flex-grow overflow-hidden">
        <h2 className="text-lg font-semibold text-white">Active Trades</h2>
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
          {trades.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">No active trades</div>
          ) : (
            trades.map((trade) => {
              const timeRemaining = Math.max(0, Math.ceil((trade.expiryTime - Date.now()) / 1000));
              return (
                <div key={trade.id} className="flex flex-col gap-2 p-3 bg-gray-800/60 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${trade.type === 'Call' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.type} • {trade.amount} XLM
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {trade.status === 'active' ? `00:${timeRemaining.toString().padStart(2, '0')}` : trade.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500">Entry</span>
                      <span className="text-xs text-white font-mono">{trade.entryPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-500">Live PnL</span>
                      <span className="text-sm font-mono">{calculateLivePnL(trade)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
