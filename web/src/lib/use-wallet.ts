import { useState, useEffect, useCallback } from "react";
import {
  connectWallet as stellarConnectWallet,
  disconnectWallet as stellarDisconnectWallet,
  getConnectedPublicKey,
  isWalletConnected,
} from "./stellar-helper";

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (isWalletConnected()) {
          const address = getConnectedPublicKey();
          if (address) setPublicKey(address);
        }
      } catch (err) {
        console.error("Wallet check failed", err);
      }
    };
    checkConnection();
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      const address = await stellarConnectWallet();
      setPublicKey(address);
      return address;
    } catch (err) {
      console.error("Failed to connect wallet", err);
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    stellarDisconnectWallet();
    setPublicKey(null);
  }, []);

  return { publicKey, connectWallet, disconnectWallet };
}
