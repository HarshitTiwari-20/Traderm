"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isConnected, getAddress, isAllowed, signTransaction, getNetworkDetails } from "@stellar/freighter-api";
import { Horizon, rpc, Contract, TransactionBuilder, Networks, nativeToScVal, xdr } from "@stellar/stellar-sdk";

type TradeType = "Call" | "Put";
type Symbol = "BTCUSDT" | "ETHUSDT" | "XLMUSDT";

interface ActiveTrade {
  id: string;
  symbol: Symbol;
  type: TradeType;
  amount: number;
  entryPrice: number;
  expiryTime: number;
  status: "active" | "won" | "lost" | "tie";
  txHash?: string;
}

const TESTNET_CONTRACT_ID = "CADKQRPQ3BKQ6GZ3UQEDJAYM6ROHJEHPIQZG2N5ANGTOHTJ7ASUCN3DW";
const MAINNET_CONTRACT_ID = "";
const QUICK_AMOUNTS = [5, 10, 25, 50];
const SYMBOLS: Symbol[] = ["BTCUSDT", "ETHUSDT", "XLMUSDT"];
const WS_STREAMS: Record<Symbol, string> = {
  BTCUSDT: "btcusdt@ticker",
  ETHUSDT: "ethusdt@ticker",
  XLMUSDT: "xlmusdt@ticker",
};

// Circular countdown ring SVG
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const progress = circ - (seconds / total) * circ;
  const color = seconds <= 10 ? "#ef4444" : seconds <= 30 ? "#f59e0b" : "#10b981";
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#1f2937" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={progress}
        strokeLinecap="round" transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="bold" fill={color} fontFamily="monospace">
        {seconds}s
      </text>
    </svg>
  );
}

export default function TradePanel({ symbol, onSymbolChange }: {
  symbol: Symbol;
  onSymbolChange: (s: Symbol) => void;
}) {
  const [network, setNetwork] = useState<"TESTNET" | "PUBLIC">("TESTNET");
  const [amount, setAmount] = useState<number>(0);
  const [expiry, setExpiry] = useState<number>(60);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const currentPriceRef = useRef(currentPrice);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);
  const [trades, setTrades] = useState<ActiveTrade[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("traderm_trades");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load trades", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("traderm_trades", JSON.stringify(trades));
  }, [trades]);
  const [isTxPending, setIsTxPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"trade" | "history">("trade");
  const [now, setNow] = useState<number>(() => Date.now());
  const PAYOUT_RATE = 0.80;

  const getNetworkConfig = useCallback(() => {
    if (network === "PUBLIC") return {
      horizonUrl: "https://horizon.stellar.org",
      rpcUrl: "https://soroban-rpc.mainnet.stellar.org",
      passphrase: Networks.PUBLIC,
      contractId: MAINNET_CONTRACT_ID,
      explorerPrefix: "https://stellar.expert/explorer/public/tx/",
    };
    return {
      horizonUrl: "https://horizon-testnet.stellar.org",
      rpcUrl: "https://soroban-testnet.stellar.org",
      passphrase: Networks.TESTNET,
      contractId: TESTNET_CONTRACT_ID,
      explorerPrefix: "https://stellar.expert/explorer/testnet/tx/",
    };
  }, [network]);

  // Fetch balance
  useEffect(() => {
    const fetch = async () => {
      try {
        if (await isConnected() && await isAllowed()) {
          const keyObj = await getAddress();
          const pubKey = typeof keyObj === "string" ? keyObj : keyObj?.address;
          if (pubKey) {
            const server = new Horizon.Server(getNetworkConfig().horizonUrl);
            try {
              const acc = await server.loadAccount(pubKey);
              type HorizonBalance = { asset_type: string; balance: string };
              const bal = acc.balances.find((b: HorizonBalance) => b.asset_type === "native");
              if (bal) setAvailableBalance(parseFloat(bal.balance));
            } catch (error: unknown) {
              const status = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;
              if (status === 404) setAvailableBalance(0);
              else throw error;
            }
          }
        } else {
          setAvailableBalance(10000);
        }
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 10000);
    return () => clearInterval(iv);
  }, [getNetworkConfig]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live price via WS
  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${WS_STREAMS[symbol]}`);
    let lastUpdate = 0;
    ws.onmessage = (e) => {
      try { 
        const d = JSON.parse(e.data); 
        if (d?.c) {
          const nowMs = Date.now();
          if (nowMs - lastUpdate > 500) { // Throttle to 2 updates per second
            setCurrentPrice(parseFloat(d.c)); 
            lastUpdate = nowMs;
          }
        } 
      } catch {}
    };
    return () => ws.close();
  }, [symbol]);

  // Evaluate trades
  useEffect(() => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.status !== "active") return t;
        if (Date.now() >= t.expiryTime) {
          const price = currentPriceRef.current;
          let status: "won" | "lost" | "tie" = "lost";
          if (t.type === "Call" && price > t.entryPrice) status = "won";
          if (t.type === "Put" && price < t.entryPrice) status = "won";
          if (price === t.entryPrice) status = "tie";
          if (status === "won") setAvailableBalance((b) => b + t.amount + t.amount * PAYOUT_RATE);
          else if (status === "tie") setAvailableBalance((b) => b + t.amount);
          return { ...t, status };
        }
        return t;
      })
    );
  }, [now]); // Evaluate on `now` tick (every 1s)

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (availableBalance > 0) setSliderValue((val / availableBalance) * 100);
  };

  const handleSliderChange = (val: number) => {
    setSliderValue(val);
    setAmount(Number(((availableBalance * val) / 100).toFixed(2)));
  };

  const handleTrade = async (type: TradeType) => {
    if (amount <= 0 || amount > availableBalance || currentPrice === 0) return;
    const config = getNetworkConfig();
    if (!config.contractId) { alert(`Contract not deployed on ${network}!`); return; }
    setIsTxPending(true);
    try {
      if (!await isConnected() || !await isAllowed()) throw new Error("Wallet not connected");
      const walletNet = await getNetworkDetails();
      if (walletNet.networkPassphrase !== config.passphrase)
        throw new Error(`Network mismatch! Switch Freighter to ${network === "TESTNET" ? "Test Net" : "Main Net"}.`);
      const keyObj = await getAddress();
      const pubKey = typeof keyObj === "string" ? keyObj : keyObj?.address;
      if (!pubKey) throw new Error("Could not get public key");
      const server = new rpc.Server(config.rpcUrl);
      const horizon = new Horizon.Server(config.horizonUrl);
      const account = await horizon.loadAccount(pubKey);
      const contract = new Contract(config.contractId);
      const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: config.passphrase })
        .addOperation(contract.call("open_trade",
          nativeToScVal(pubKey, { type: "address" }),
          nativeToScVal(symbol.replace("USDT", ""), { type: "string" }),
          nativeToScVal(Math.floor(amount * 10_000_000), { type: "i128" }),
          nativeToScVal(Math.floor(currentPrice * 100), { type: "i128" }),
          nativeToScVal(Math.floor(Date.now() / 1000) + expiry, { type: "u64" }),
          xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(type)])
        ))
        .setTimeout(60).build();
      const assembled = await server.prepareTransaction(tx);
      const signResult = await signTransaction(assembled.toXDR(), { networkPassphrase: config.passphrase });
      if (signResult.error) throw new Error(signResult.error.message || "Signing failed");
      const signed = TransactionBuilder.fromXDR(signResult.signedTxXdr, config.passphrase);
      const res = await server.sendTransaction(signed);
      if ((res.status as string) === "PENDING" || (res.status as string) === "SUCCESS") {
        setAvailableBalance((b) => b - amount);
        setTrades((prev) => [{
          id: Math.random().toString(36).substr(2, 9),
          symbol, type, amount,
          entryPrice: currentPrice,
          expiryTime: Date.now() + expiry * 1000,
          status: "active",
          txHash: res.hash,
        }, ...prev]);
      } else throw new Error("Transaction failed");
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsTxPending(false);
    }
  };

  const totalPnL = trades
    .filter((t) => t.status === "won" || t.status === "lost")
    .reduce((sum, t) => sum + (t.status === "won" ? t.amount * PAYOUT_RATE : -t.amount), 0);

  const wonCount = trades.filter((t) => t.status === "won").length;
  const lostCount = trades.filter((t) => t.status === "lost").length;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Tab switcher */}
      <div className="flex bg-gray-800/60 rounded-xl p-1">
        {(["trade", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              activeTab === tab ? "bg-gray-700 text-white shadow" : "text-gray-500 hover:text-gray-300"
            }`}>
            {tab === "trade" ? "Trade" : `History${trades.length > 0 ? ` (${trades.length})` : ""}`}
          </button>
        ))}
      </div>

      {activeTab === "trade" ? (
        <>
          {/* Main Trading Panel */}
          <div className="flex flex-col gap-4 p-4 bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-2xl">

            {/* Network Toggle */}
            <div className="flex bg-gray-800 rounded-xl p-1">
              {(["TESTNET", "PUBLIC"] as const).map((net) => (
                <button key={net} onClick={() => setNetwork(net)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    network === net
                      ? net === "PUBLIC" ? "bg-emerald-600 text-white shadow" : "bg-gray-700 text-white shadow"
                      : "text-gray-400 hover:text-gray-200"
                  }`}>
                  {net === "TESTNET" ? "Testnet" : "Mainnet"}
                </button>
              ))}
            </div>

            {/* Symbol Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">Market</label>
              <div className="flex gap-1.5">
                {SYMBOLS.map((s) => (
                  <button key={s} onClick={() => onSymbolChange(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      symbol === s
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                        : "bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300"
                    }`}>
                    {s.replace("USDT", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Live price badge */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Live Price</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ${currentPrice > 0 ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 1 ? 6 : 2 }) : "—"}
              </span>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-500 font-medium">Amount (XLM)</label>
                <span className="text-xs text-gray-400">{availableBalance.toFixed(2)} XLM</span>
              </div>
              <div className="flex bg-gray-800/80 rounded-xl overflow-hidden border border-gray-700 focus-within:border-emerald-500 transition-colors">
                <span className="p-3 text-gray-400 pl-4">$</span>
                <input type="number" value={amount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  className="bg-transparent w-full p-3 pl-1 text-white outline-none font-medium text-sm" />
              </div>
              {/* Quick presets */}
              <div className="flex gap-1.5">
                {QUICK_AMOUNTS.map((q) => (
                  <button key={q} onClick={() => handleAmountChange(q)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      amount === q
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300"
                    }`}>
                    {q}
                  </button>
                ))}
              </div>
              <input type="range" min="0" max="100" step="25" value={sliderValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1" />
              <div className="flex justify-between text-[10px] text-gray-600 px-0.5 font-medium">
                {["0%","25%","50%","75%","100%"].map((l) => <span key={l}>{l}</span>)}
              </div>
            </div>

            {/* Expiry */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 font-medium">Expiry</label>
              <div className="flex gap-1.5">
                {[15, 30, 60, 300].map((t) => (
                  <button key={t} onClick={() => setExpiry(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      expiry === t
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-500/50"
                        : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                    }`}>
                    {t < 60 ? `${t}s` : `${t / 60}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout preview */}
            {amount > 0 && (
              <div className="flex justify-between items-center text-xs px-1">
                <span className="text-gray-500">Potential Return</span>
                <span className="text-emerald-400 font-mono font-bold">+{(amount + amount * PAYOUT_RATE).toFixed(2)} XLM</span>
              </div>
            )}

            {/* Trade buttons */}
            <div className="flex gap-2">
              <button onClick={() => handleTrade("Call")}
                disabled={amount <= 0 || amount > availableBalance || isTxPending}
                className="group relative flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm shadow-[0_0_16px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="relative z-10">{isTxPending ? "..." : "CALL"}</span>
              </button>
              <button onClick={() => handleTrade("Put")}
                disabled={amount <= 0 || amount > availableBalance || isTxPending}
                className="group relative flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm shadow-[0_0_16px_rgba(239,68,68,0.3)] disabled:shadow-none transition-all overflow-hidden">
                <div className="absolute inset-0 bg-white/10 -translate-y-full group-hover:translate-y-0 transition-transform" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="relative z-10">{isTxPending ? "..." : "PUT"}</span>
              </button>
            </div>
          </div>

          {/* Active trades */}
          {trades.filter((t) => t.status === "active").length > 0 && (
            <div className="flex flex-col gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Trades</h3>
              {trades.filter((t) => t.status === "active").map((trade) => {
                const remaining = Math.max(0, Math.ceil((trade.expiryTime - now) / 1000));
                const isWinning = (trade.type === "Call" && currentPrice > trade.entryPrice) ||
                                  (trade.type === "Put" && currentPrice < trade.entryPrice);
                return (
                  <div key={trade.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <CountdownRing seconds={remaining} total={expiry} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trade.type === "Call" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {trade.type}
                        </span>
                        <span className="text-xs text-gray-500">{trade.symbol.replace("USDT","")}</span>
                        <span className="text-xs text-gray-400 font-mono">{trade.amount} XLM</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">Entry: <span className="text-gray-300 font-mono">${trade.entryPrice.toFixed(2)}</span></span>
                        <span className={isWinning ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                          {isWinning ? `+${(trade.amount + trade.amount * PAYOUT_RATE).toFixed(2)}` : `-${trade.amount.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* History Tab */
        <div className="flex flex-col gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl flex-1 overflow-hidden">
          {/* P&L Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total P&L", value: `${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Won", value: wonCount.toString(), color: "text-emerald-400" },
              { label: "Lost", value: lostCount.toString(), color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 bg-gray-800/60 rounded-xl p-3 text-center">
                <span className={`text-base font-bold font-mono ${s.color}`}>{s.value}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Win rate bar */}
          {(wonCount + lostCount) > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Win Rate</span>
                <span className="text-white">{Math.round((wonCount / (wonCount + lostCount)) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${(wonCount / (wonCount + lostCount)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Trade history list */}
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
            {trades.length === 0 ? (
              <div className="text-gray-600 text-xs text-center py-8">No trades yet</div>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    trade.status === "won" ? "bg-emerald-500/20" :
                    trade.status === "lost" ? "bg-red-500/20" :
                    trade.status === "active" ? "bg-blue-500/20" : "bg-gray-700"
                  }`}>
                    {trade.status === "won" && <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                    {trade.status === "lost" && <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>}
                    {trade.status === "active" && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                    {trade.status === "tie" && <span className="text-gray-400 text-[10px] font-bold">=</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-white">{trade.symbol.replace("USDT","")} {trade.type}</span>
                      <span className={`text-xs font-mono font-bold ${
                        trade.status === "won" ? "text-emerald-400" :
                        trade.status === "lost" ? "text-red-400" : "text-gray-400"
                      }`}>
                        {trade.status === "won" ? `+${(trade.amount + trade.amount * PAYOUT_RATE).toFixed(2)}` :
                         trade.status === "lost" ? `-${trade.amount.toFixed(2)}` :
                         trade.status === "active" ? "Active" : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                      <span>{trade.amount} XLM @ ${trade.entryPrice.toFixed(2)}</span>
                      {trade.txHash && (
                        <a href={`https://stellar.expert/explorer/testnet/tx/${trade.txHash}`}
                          target="_blank" rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline font-mono">
                          txn↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
