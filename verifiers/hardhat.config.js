require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/deploy") // add for hardhat deploying

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  },

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    // goerli: {
    //   url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    //   accounts: [GOERLI_PRIVATE_KEY],
    // }
  }
};
