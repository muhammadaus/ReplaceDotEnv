const { ethers } = require("hardhat");
const { EthereumProvider } = require('@walletconnect/ethereum-provider');

async function main() {
  console.log("Starting deployment process on Sepolia...");

  // Configure WalletConnect Provider
  const provider = await EthereumProvider.init({
    projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID', // Get this from cloud.walletconnect.com
    chains: [11155111], // Sepolia chainId
    optionalChains: [11155111],
    showQrModal: true,
    methods: ['eth_sendTransaction', 'personal_sign'],
    qrModalOptions: { themeMode: "light" }
  });

  try {
    // Connect wallet
    await provider.enable();
    
    // Get the connected wallet address
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const walletAddress = accounts[0];
    
    console.log("Connected wallet address:", walletAddress);

    // Get the contract factory
    const MyToken = await ethers.getContractFactory("MyToken");
    
    // Create deployment transaction
    const web3Provider = new ethers.providers.Web3Provider(provider);
    const factory = new ethers.ContractFactory(
      MyToken.interface,
      MyToken.bytecode,
      web3Provider.getSigner()
    );

    console.log("Deploying contract...");
    
    // Deploy the contract
    const contract = await factory.deploy(walletAddress);
    console.log("Waiting for deployment confirmation...");
    
    await contract.deployed();
    console.log("Contract deployed to:", contract.address);

  } catch (error) {
    console.error("Deployment failed:", error);
  } finally {
    // Disconnect wallet
    await provider.disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 