"use client";

import { useState, useEffect } from "react";
import { isConnected, requestAccess, getAddress, isAllowed, setAllowed } from "@stellar/freighter-api";

export default function WalletConnect() {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if previously connected
    const checkConnection = async () => {
      try {
        if (await isConnected()) {
          const allowed = await isAllowed();
          if (allowed) {
            const keyObj = await getAddress();
            if (keyObj && keyObj.address) {
                setPublicKey(keyObj.address);
            } else if (typeof keyObj === "string") {
                setPublicKey(keyObj);
            }
          }
        }
      } catch (err) {
        console.error("Freighter check failed", err);
      }
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    try {
      if (await isConnected()) {
        await setAllowed();
        const keyObj = await getAddress();
        if (keyObj && keyObj.address) {
            setPublicKey(keyObj.address);
        } else if (typeof keyObj === "string") {
            setPublicKey(keyObj);
        }
      } else {
        alert("Freighter wallet is not installed!");
      }
    } catch (err) {
      console.error("Failed to connect wallet", err);
    }
  };

  if (publicKey) {
    return (
      <button className="px-5 py-2 rounded-full text-sm font-medium border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 transition-colors flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
      </button>
    );
  }

  return (
    <button 
      onClick={connectWallet}
      className="px-5 py-2 rounded-full text-sm font-medium border border-gray-700 hover:border-gray-500 transition-colors bg-gray-900/50"
    >
      Connect Wallet
    </button>
  );
}

