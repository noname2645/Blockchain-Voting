require('dotenv').config(); // <-- Add this at the top
const HDWalletProvider = require('@truffle/hdwallet-provider');

console.log("PRIVATE_KEY loaded? ", !!process.env.PRIVATE_KEY);
console.log("BLAST_API_KEY: ", process.env.BLAST_API_KEY);

module.exports = {
  networks: {
    sepolia: {
      provider: () => new HDWalletProvider({
        privateKeys: [process.env.PRIVATE_KEY],
        providerOrUrl: process.env.BLAST_API_KEY
      }),
      network_id: 11155111,
      gas: 8000000,
      gasPrice: 1000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.8.0"
    }
  }
};
