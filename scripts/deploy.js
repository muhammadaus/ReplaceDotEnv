const { ethers } = require("hardhat");
const { JsonRpcProvider } = require("@ethersproject/providers");
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { startServer, setTransaction } = require('./server');

async function main() {
    console.log("Starting deployment process on Sepolia...");

    // Get the RPC URL from command line arguments
    const rpcUrl = process.argv[process.argv.indexOf('--url') + 1];
    if (!rpcUrl || rpcUrl === "SEPOLIA_RPC_URL") {
        throw new Error("Please provide a valid Sepolia RPC URL");
    }

    console.log("Connecting to Sepolia...");
    const provider = new JsonRpcProvider(rpcUrl);

    // Create public directory if it doesn't exist
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
    }

    console.log("Preparing deployment transaction...");
    // Get the deployment transaction data
    const MyToken = await ethers.getContractFactory("MyToken");
    const [deployer] = await ethers.getSigners();
    const deployTx = await MyToken.getDeployTransaction(deployer.address);

    // Format transaction for MetaMask
    const transaction = {
        to: null, // Contract deployment
        data: deployTx.data,
        chainId: 11155111, // Sepolia
        value: '0x0'
    };

    // Store transaction in server
    setTransaction(transaction);

    console.log("Starting local server...");
    // Start server and get local URL
    const serverUrl = await startServer();

    // Generate QR code for the server URL
    const qrPath = path.join(publicDir, 'server-qr.png');
    await QRCode.toFile(
        qrPath,
        serverUrl,
        {
            errorCorrectionLevel: 'L',
            scale: 8,
            margin: 1
        }
    );

    console.log("\n=================================");
    console.log("Scan this QR code with your iPhone:");
    console.log(`${serverUrl}/server-qr.png`);
    console.log("\nOr open this URL directly:");
    console.log(serverUrl);
    console.log("=================================\n");
    console.log("Make sure your iPhone is on the same WiFi network");
    console.log("Waiting for transaction to be signed...");

    // Wait for signed transaction
    while (!fs.existsSync('signed-transaction.json')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Read transaction hash
    const { txHash } = JSON.parse(fs.readFileSync('signed-transaction.json', 'utf8'));
    
    console.log("\nTransaction sent!");
    console.log("Transaction hash:", txHash);
    console.log("View on Etherscan:", `https://sepolia.etherscan.io/tx/${txHash}`);
    console.log("\nWaiting for confirmation...");

    try {
        const receipt = await provider.waitForTransaction(txHash);
        console.log("\nTransaction confirmed!");
        console.log("Contract deployed to:", receipt.contractAddress);
    } catch (error) {
        console.error("\nError waiting for transaction:", error.message);
        console.log("You can check the status at:");
        console.log(`https://sepolia.etherscan.io/tx/${txHash}`);
    }

    // Clean up
    fs.unlinkSync('signed-transaction.json');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:", error.message);
        process.exit(1);
    }); 