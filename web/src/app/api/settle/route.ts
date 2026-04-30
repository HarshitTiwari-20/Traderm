import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  Networks,
  rpc,
  Horizon,
  TransactionBuilder,
  Contract,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";

const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const MAINNET_RPC = "https://soroban-rpc.mainnet.stellar.org";
const TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const MAINNET_HORIZON = "https://horizon.stellar.org";

const CONTRACT_ID_TESTNET =
  process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID_TESTNET || "";
const CONTRACT_ID_MAINNET =
  process.env.SOROBAN_CONTRACT_ID_MAINNET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tradeId,          // number — the u64 returned by open_trade()
      exitPrice,        // number — the price at expiry (in dollars, e.g. 65432.10)
      network = "TESTNET", // "TESTNET" | "PUBLIC"
    } = body as { tradeId: number; exitPrice: number; network?: string };

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (typeof tradeId !== "number" || typeof exitPrice !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid tradeId / exitPrice" },
        { status: 400 }
      );
    }

    // ── Oracle keypair (server-side secret) ──────────────────────────────────
    const oracleSecret = process.env.ORACLE_SECRET_KEY;
    if (!oracleSecret) {
      console.error("ORACLE_SECRET_KEY env var is not set");
      return NextResponse.json(
        { error: "Oracle not configured. Set ORACLE_SECRET_KEY in env vars." },
        { status: 500 }
      );
    }

    let oracleKeypair: Keypair;
    try {
      oracleKeypair = Keypair.fromSecret(oracleSecret);
    } catch {
      return NextResponse.json(
        { error: "Invalid ORACLE_SECRET_KEY format" },
        { status: 500 }
      );
    }

    // ── Network config ───────────────────────────────────────────────────────
    const isMainnet = network === "PUBLIC";
    const networkPassphrase = isMainnet ? Networks.PUBLIC : Networks.TESTNET;
    const rpcUrl = isMainnet ? MAINNET_RPC : TESTNET_RPC;
    const horizonUrl = isMainnet ? MAINNET_HORIZON : TESTNET_HORIZON;
    const contractId = isMainnet ? CONTRACT_ID_MAINNET : CONTRACT_ID_TESTNET;

    if (!contractId) {
      return NextResponse.json(
        { error: `Contract ID not configured for ${network}` },
        { status: 500 }
      );
    }

    // ── Build settlement transaction ─────────────────────────────────────────
    const server = new rpc.Server(rpcUrl);
    const horizon = new Horizon.Server(horizonUrl);

    const oraclePubKey = oracleKeypair.publicKey();
    const account = await horizon.loadAccount(oraclePubKey);
    const contract = new Contract(contractId);

    // Convert exitPrice to contract's i128 format (price * 100, same as open_trade)
    const twapPriceScVal = nativeToScVal(
      BigInt(Math.round(exitPrice * 100)),
      { type: "i128" }
    );

    // trade_id is u64
    const tradeIdScVal = nativeToScVal(BigInt(tradeId), { type: "u64" });

    const tx = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          "settle_trade",
          nativeToScVal(oraclePubKey, { type: "address" }),
          tradeIdScVal,
          twapPriceScVal
        )
      )
      .setTimeout(120)
      .build();

    // Simulate (prepare) the transaction
    const assembled = await server.prepareTransaction(tx);

    // Sign with oracle keypair (server-side, no wallet needed)
    assembled.sign(oracleKeypair);

    // Submit
    const result = await server.sendTransaction(assembled);

    if (result.status === "ERROR") {
      console.error("Settlement tx error:", result);
      return NextResponse.json(
        { error: "Settlement transaction failed", details: result },
        { status: 500 }
      );
    }

    // Poll until confirmed (up to 30s)
    let finalStatus: string = result.status;
    if (result.status === "PENDING") {
      const hash = result.hash;
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await server.getTransaction(hash);
        if (poll.status !== "NOT_FOUND") {
          finalStatus = poll.status as string;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      hash: result.hash,
      status: finalStatus,
      tradeId,
      exitPrice,
    });
  } catch (err) {
    console.error("Settlement error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Unknown settlement error",
      },
      { status: 500 }
    );
  }
}
