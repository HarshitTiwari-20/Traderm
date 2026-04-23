const { rpc, TransactionBuilder, Networks, Horizon } = require("@stellar/stellar-sdk");
const server = new rpc.Server("https://soroban-testnet.stellar.org");
console.log(typeof server.prepareTransaction);
