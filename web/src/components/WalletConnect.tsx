"use client";

import { useWallet } from "@/lib/use-wallet";
import toast from "react-hot-toast";

export default function WalletConnect() {
  const { publicKey, connectWallet, disconnectWallet } = useWallet();

  const connectWalletHandler = async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected successfully!", {
        style: {
          background: "#333",
          color: "#fff",
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message !== "User closed the modal") {
        toast.error(String(err));
      }
    }
  };

  const disconnectWalletHandler = () => {
    disconnectWallet();
  };

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <button className="px-5 py-2 rounded-full text-sm font-medium border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 transition-colors flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
        </button>
        <button
          onClick={disconnectWalletHandler}
          className="px-5 py-2 rounded-full text-sm font-medium border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWalletHandler}
      className="px-5 py-2 rounded-full text-sm font-medium border border-gray-700 hover:border-gray-500 transition-colors bg-gray-900/50"
    >
      Connect Wallet
    </button>
  );
}

