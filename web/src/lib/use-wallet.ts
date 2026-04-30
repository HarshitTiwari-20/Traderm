import { useState, useEffect, useCallback } from "react";
import {
  connectWallet as stellarConnectWallet,
  disconnectWallet as stellarDisconnectWallet,
  getConnectedPublicKey,
  isWalletConnected,
} from "./stellar-helper";

// Shared state for all useWallet hooks
let globalPublicKey: string | null = null;
const listeners = new Set<(key: string | null) => void>();

function updateGlobalPublicKey(key: string | null) {
  globalPublicKey = key;
  listeners.forEach((l) => l(key));
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(globalPublicKey);

  useEffect(() => {
    // Initial sync
    if (isWalletConnected()) {
      const address = getConnectedPublicKey();
      if (address !== globalPublicKey) {
        updateGlobalPublicKey(address);
      }
    }

    const listener = (key: string | null) => setPublicKey(key);
    listeners.add(listener);
    
    // Set local state to current global value
    setPublicKey(globalPublicKey);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      const address = await stellarConnectWallet();
      updateGlobalPublicKey(address);
      return address;
    } catch (err) {
      console.error("Failed to connect wallet", err);
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    stellarDisconnectWallet();
    updateGlobalPublicKey(null);
  }, []);

  return { publicKey, connectWallet, disconnectWallet };
}

