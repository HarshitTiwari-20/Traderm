"use client";

import { useState, useEffect } from "react";
import { isConnected, getAddress, isAllowed, signTransaction, getNetworkDetails } from "@stellar/freighter-api";
import { Horizon, rpc, Contract, TransactionBuilder, Networks, nativeToScVal, xdr } from "@stellar/stellar-sdk";

type TradeType = "Call" | "Put";

interface ActiveTrade {
  id: string;
  type: TradeType;
  amount: number;
  entryPrice: number;
  expiryTime: number; // Unix timestamp
  status: "active" | "won" | "lost" | "tie";
  txHash?: string;
}

const TESTNET_CONTRACT_ID = "CADKQRPQ3BKQ6GZ3UQEDJAYM6ROHJEHPIQZG2N5ANGTOHTJ7ASUCN3DW";
const MAINNET_CONTRACT_ID = ""; // To be deployed

export default function TradePanel() {
  const [network, setNetwork] = useState<"TESTNET" | "PUBLIC">("TESTNET");
  const [amount, setAmount] = useState<number>(0);
  const [expiry, setExpiry] = useState<number>(60); // seconds
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [trades, setTrades] = useState<ActiveTrade[]>([]);
  const [isTxPending, setIsTxPending] = useState(false);
  const PAYOUT_RATE = 0.82; // 82% profit on win

  const getNetworkConfig = () => {
    if (network === "PUBLIC") {
      return {
        horizonUrl: "https://horizon.stellar.org",
        rpcUrl: "https://soroban-rpc.mainnet.stellar.org",
        passphrase: Networks.PUBLIC,
        contractId: MAINNET_CONTRACT_ID,
        explorerPrefix: "https://stellar.expert/explorer/public/tx/"
      };
    }
    return {
      horizonUrl: "https://horizon-testnet.stellar.org",
      rpcUrl: "https://soroban-testnet.stellar.org",
      passphrase: Networks.TESTNET,
      contractId: TESTNET_CONTRACT_ID,
      explorerPrefix: "https://stellar.expert/explorer/testnet/tx/"
    };
  };

  // Fetch Available Balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (await isConnected() && await isAllowed()) {
          const keyObj = await getAddress();
          const pubKey = typeof keyObj === "string" ? keyObj : keyObj?.address;
          if (pubKey) {
            const config = getNetworkConfig();
            const server = new Horizon.Server(config.horizonUrl);
            try {
              const account = await server.loadAccount(pubKey);
              const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
              if (nativeBalance) {
                setAvailableBalance(parseFloat(nativeBalance.balance));
              }
            } catch (e: any) {
              if (e?.response?.status === 404) {
                setAvailableBalance(0); // Account not funded on this network
              } else {
                throw e;
              }
            }
          }
        } else {
          setAvailableBalance(10000);
        }
      } catch (err) {
        console.error("Failed to fetch balance", err);
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [network]);

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

          if (now >= trade.expiryTime) {
            let status: "won" | "lost" | "tie" = "lost";
            if (trade.type === "Call" && currentPrice > trade.entryPrice) status = "won";
            if (trade.type === "Put" && currentPrice < trade.entryPrice) status = "won";
            if (currentPrice === trade.entryPrice) status = "tie";

            if (status === "won") {
              setAvailableBalance((b) => b + trade.amount + (trade.amount * PAYOUT_RATE));
            } else if (status === "tie") {
              setAvailableBalance((b) => b + trade.amount);
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

  const handleTrade = async (type: TradeType) => {
    if (amount <= 0 || amount > availableBalance || currentPrice === 0) return;

    const config = getNetworkConfig();
    if (!config.contractId) {
      alert(`Smart Contract is not yet deployed on ${network}!`);
      return;
    }

    setIsTxPending(true);
    try {
      if (!await isConnected() || !await isAllowed()) {
        throw new Error("Wallet not connected");
      }

      // Pre-flight: verify Freighter wallet is set to the same network
      const walletNetDetails = await getNetworkDetails();
      if (walletNetDetails.networkPassphrase !== config.passphrase) {
        const walletNet = walletNetDetails.network || "unknown";
        const appNet = network === "TESTNET" ? "Test Net" : "Main Net";
        throw new Error(
          `Network mismatch! Your Freighter wallet is on "${walletNet}" but the app is set to "${appNet}". ` +
          `Please switch your Freighter wallet to ${appNet} or change the network toggle.`
        );
      }
      
      const keyObj = await getAddress();
      const pubKey = typeof keyObj === "string" ? keyObj : keyObj?.address;
      if (!pubKey) throw new Error("Could not get public key");

      const server = new rpc.Server(config.rpcUrl);
      const horizon = new Horizon.Server(config.horizonUrl);
      const account = await horizon.loadAccount(pubKey);
      
      const contract = new Contract(config.contractId);
      
      // Convert inputs to Soroban SCVals
      const amountStroops = Math.floor(amount * 10_000_000); // XLM is 7 decimals
      const priceCents = Math.floor(currentPrice * 100); // integer prices

      // In Soroban, custom Enums without data map to ScVal::Symbol if simple, or we can use generic symbol for our contract Prediction type.
      // E.g., Prediction::Call -> Symbol("Call")
      const tx = new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase: config.passphrase,
      })
      .addOperation(
        contract.call("open_trade",
          nativeToScVal(pubKey, { type: "address" }),
          nativeToScVal("BTCUSDT", { type: "string" }),
          nativeToScVal(amountStroops, { type: "i128" }),
          nativeToScVal(priceCents, { type: "i128" }),
          nativeToScVal(Math.floor(Date.now() / 1000) + expiry, { type: "u64" }),
          xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(type)])
        )
      )
      .setTimeout(60)
      .build();

      // 1. Simulate and Assemble with auths & footprint
      const assembledTx = await server.prepareTransaction(tx);

      // 2. Sign with Freighter — only networkPassphrase is valid in v6 API
      const signResult = await signTransaction(assembledTx.toXDR(), { 
        networkPassphrase: config.passphrase,
      });
      
      if (signResult.error) {
        throw new Error(signResult.error.message || "Wallet signing failed");
      }
      
      const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, config.passphrase);

      // 4. Submit to Network
      const res = await server.sendTransaction(signedTx);

      if (res.status === "PENDING" || res.status === "SUCCESS") {
        const newTrade: ActiveTrade = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          amount,
          entryPrice: currentPrice,
          expiryTime: Date.now() + expiry * 1000,
          status: "active",
          txHash: res.hash,
        };

        // UI Updates
        setAvailableBalance((b) => b - amount);
        setTrades((prev) => [newTrade, ...prev]);
      } else {
        throw new Error("Failed to submit transaction");
      }
    } catch (err) {
      console.error(err);
      alert("Blockchain Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsTxPending(false);
    }
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
        
        {/* Network Toggle */}
        <div className="flex bg-gray-800 rounded-xl p-1 mb-2">
          <button
            onClick={() => setNetwork("TESTNET")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              network === "TESTNET" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            TESTNET
          </button>
          <button
            onClick={() => setNetwork("PUBLIC")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              network === "PUBLIC" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            MAINNET
          </button>
        </div>

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
            disabled={amount <= 0 || amount > availableBalance || isTxPending}
            className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            {isTxPending ? "CONFIRMING..." : "CALL"}
          </button>

          <button
            onClick={() => handleTrade("Put")}
            disabled={amount <= 0 || amount > availableBalance || isTxPending}
            className="group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500 hover:bg-red-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:shadow-none transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 -translate-y-full group-hover:translate-y-0 transition-transform" />
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            {isTxPending ? "CONFIRMING..." : "PUT"}
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

                  {/* Blockchain Link */}
                  {trade.txHash && (
                    <div className="mt-2 border-t border-gray-700/50 pt-2 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500">Txn</span>
                      <a 
                        href={`${getNetworkConfig().explorerPrefix}${trade.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 underline font-mono"
                      >
                        {trade.txHash.slice(0, 12)}...
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
