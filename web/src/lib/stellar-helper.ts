'use client';

import * as StellarSdk from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit/modules/freighter";

const STORAGE_KEY = "payread_wallet_address";

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

class StellarHelper {
  private networkPassphrase: string;
  private walletNetwork: Networks;
  private initialized = false;
  private _publicKey: string | null = null;

  constructor(network: "testnet" | "mainnet" = "testnet") {
    this.networkPassphrase =
      network === "testnet"
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.walletNetwork =
      network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;

    this.loadSavedWallet();
  }

  private loadSavedWallet(): void {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.startsWith("G")) {
        this._publicKey = saved;
      }
    } catch (error) {
      console.warn("Failed to load saved wallet:", error);
    }
  }

  private saveWalletAddress(address: string): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, address);
    } catch (error) {
      console.warn("Failed to save wallet address:", error);
    }
  }

  private clearSavedWallet(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear saved wallet:", error);
    }
  }

  get isConnected(): boolean {
    return this._publicKey !== null;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  private ensureKit(): void {
    if (this.initialized) return;
    if (typeof window === "undefined") {
      throw new Error(
        "StellarWalletsKit can only be initialized in a browser environment."
      );
    }

    StellarWalletsKit.init({
      network: this.walletNetwork,
      selectedWalletId: FREIGHTER_ID,
      modules: defaultModules(),
      modalTheme: 'dark',
    });

    this.initialized = true;
  }

  async connectWallet(): Promise<string> {
    this.ensureKit();

    const { address } = await StellarWalletsKit.authModal();
    if (!address || !address.startsWith("G")) {
      throw new Error("Invalid or missing public key from wallet.");
    }

    this._publicKey = address;
    this.saveWalletAddress(address);
    return address;
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string, address?: string }): Promise<{ signedTxXdr: string }> {
    this.ensureKit();

    const signer = opts?.address || this._publicKey ? { address: opts?.address || this._publicKey! } : {};
    return StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase || this.networkPassphrase,
      ...signer,
    });
  }

  async getNetworkDetails(): Promise<{ networkPassphrase: string }> {
    this.ensureKit();
    // In @creit.tech/stellar-wallets-kit, the method is called getNetwork()
    return (StellarWalletsKit as any).getNetwork();
  }

  async verifyConnection(address: string): Promise<boolean> {
    try {
      if (this._publicKey && this._publicKey === address) {
        this.ensureKit();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    this._publicKey = null;
    this.initialized = false;
    this.clearSavedWallet();

    try {
      void StellarWalletsKit.disconnect();
    } catch (error) {
      console.warn("Failed to disconnect wallet kit:", error);
    }
  }
}

const stellar = new StellarHelper("testnet");

export const connectWallet = () => stellar.connectWallet();
export const signTransaction = (xdr: string, opts?: any) => stellar.signTransaction(xdr, opts);
export const disconnectWallet = () => stellar.disconnect();
export const isWalletConnected = () => stellar.isConnected;
export const getConnectedPublicKey = () => stellar.publicKey;
export const getNetworkDetails = () => stellar.getNetworkDetails();
export const verifyWalletConnection = (address: string) => stellar.verifyConnection(address);
