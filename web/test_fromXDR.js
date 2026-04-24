import { Account, Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
const kp = Keypair.random();
const tx = new TransactionBuilder(new Account(kp.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET }).setTimeout(30).build();
const xdrStr = tx.toXDR();
console.log(typeof xdrStr);
try {
  const parsed = TransactionBuilder.fromXDR(xdrStr, Networks.TESTNET);
  console.log("Parsed using TransactionBuilder.fromXDR");
} catch (error) {
  console.log("Error with TransactionBuilder.fromXDR:", error instanceof Error ? error.message : String(error));
}
