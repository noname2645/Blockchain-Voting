module.exports = {
    networks: {
      development: {
        host: "127.0.0.1",     // Localhost
        port: 7545,            // Ganache default
        network_id: "*"        // Accept any network ID returned by Ganache
      }
    },
    compilers: {
      solc: {
        version: "0.8.0",      // Same as your contract version
      }
    }
  };
  