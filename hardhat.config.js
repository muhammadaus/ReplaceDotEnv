require("@nomicfoundation/hardhat-toolbox");

// Define custom task to set RPC URL
task("deploy-with-url", "Deploys contract with specified RPC URL")
  .addParam("url", "The RPC URL")
  .setAction(async (taskArgs) => {
    config.networks.sepolia.url = taskArgs.url;
    await run("run", { script: "scripts/deploy.js", network: "sepolia" });
  });

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    sepolia: {
      url: process.argv[process.argv.indexOf('--url') + 1],
      chainId: 11155111
    }
  }
};

module.exports = config;