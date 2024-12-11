module.exports = {
  networks: {
      development: {
          host: "localhost",
          port: 7545,        // Port where Ganache is running
          network_id: "*",  // Match any network id
      }
  },
  // Specify the Solidity version to use
  compilers: {
      solc: {
          version: "0.8.0" // Match the version used in your contract
      }
  }
};
