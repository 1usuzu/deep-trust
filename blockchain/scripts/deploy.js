const hre = require("hardhat");

async function main() {
  console.log("Deploying DeepfakeVerification contract...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy contract (no constructor args - oracle signer set separately)
  const DeepfakeVerification = await hre.ethers.getContractFactory("DeepfakeVerification");
  const contract = await DeepfakeVerification.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("DeepfakeVerification deployed to:", contractAddress);

  console.log("\nDeploying VotingFactory...");
  const VotingFactory = await hre.ethers.getContractFactory("VotingFactory");
  const votingFactory = await VotingFactory.deploy();
  await votingFactory.waitForDeployment();
  const votingFactoryAddress = await votingFactory.getAddress();
  console.log("VotingFactory deployed to:", votingFactoryAddress);

  console.log("\nSave these addresses for frontend integration!");

  // Verify deployment
  const owner = await contract.owner();
  console.log("Contract owner:", owner);

  const stats = await contract.getStats();
  console.log("Initial stats - DIDs:", stats[0].toString(), ", Verifications:", stats[1].toString());

  // Save deployment info
  const fs = require("fs");
  const path = require("path");

  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    votingFactoryAddress: votingFactoryAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
  // Xác định Chain ID dựa trên network
  const chainIds = {
    localhost: 31337,
    hardhat: 31337,
    sepolia: 11155111,
    amoy: 80002
  };
  const chainId = chainIds[hre.network.name] || 31337;

  const networkNames = {
    localhost: "Hardhat Local",
    hardhat: "Hardhat Local",
    sepolia: "Sepolia",
    amoy: "Polygon Amoy"
  };
  const networkName = networkNames[hre.network.name] || "Unknown";

  const rpcUrls = {
    localhost: "http://127.0.0.1:8545",
    hardhat: "http://127.0.0.1:8545",
    sepolia: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
    amoy: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology/"
  };
  const rpcUrl = rpcUrls[hre.network.name] || "http://127.0.0.1:8545";

  console.log("\nBackend env hint:");
  console.log(`  CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`  RPC_URL=${rpcUrl}`);
  console.log(`  CHAIN_ID=${chainId}`);
  console.log(`  VOTING_FACTORY_ADDRESS=${votingFactoryAddress}`);

  // Auto-update frontend .env
  const envPath = path.join(__dirname, "../../frontend/.env");

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    const currentChainMatch = envContent.match(/VITE_CHAIN_ID=(\d+)/);
    const currentFrontendChainId = currentChainMatch ? Number(currentChainMatch[1]) : null;
    const forceUpdateFrontendEnv = process.env.FORCE_UPDATE_FRONTEND_ENV === "true";

    if (!forceUpdateFrontendEnv && currentFrontendChainId && currentFrontendChainId !== chainId) {
      console.log(`Skipped frontend .env update: current VITE_CHAIN_ID=${currentFrontendChainId}, deploy network chainId=${chainId}.`);
      console.log("Set FORCE_UPDATE_FRONTEND_ENV=true to override.");
      return;
    }

    // Replace contract address
    envContent = envContent.replace(
      /VITE_CONTRACT_ADDRESS=.*/,
      `VITE_CONTRACT_ADDRESS=${contractAddress}`
    );
    if (envContent.includes("VITE_VOTING_FACTORY_ADDRESS=")) {
      envContent = envContent.replace(
        /VITE_VOTING_FACTORY_ADDRESS=.*/,
        `VITE_VOTING_FACTORY_ADDRESS=${votingFactoryAddress}`
      );
    } else {
      envContent += `\nVITE_VOTING_FACTORY_ADDRESS=${votingFactoryAddress}`;
    }
    // Replace chain ID
    envContent = envContent.replace(
      /VITE_CHAIN_ID=.*/,
      `VITE_CHAIN_ID=${chainId}`
    );
    // Replace network name
    if (envContent.includes("VITE_NETWORK_NAME=")) {
      envContent = envContent.replace(
        /VITE_NETWORK_NAME=.*/,
        `VITE_NETWORK_NAME=${networkName}`
      );
    }
    if (envContent.includes("VITE_RPC_URL=")) {
      envContent = envContent.replace(
        /VITE_RPC_URL=.*/,
        `VITE_RPC_URL=${rpcUrl}`
      );
    } else {
      envContent += `\nVITE_RPC_URL=${rpcUrl}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`Frontend .env updated! (Contracts: ${contractAddress}, ${votingFactoryAddress}, Chain: ${chainId})`);
    // Create new .env file
    const newEnv = `VITE_API_URL=http://localhost:8000
VITE_CONTRACT_ADDRESS=${contractAddress}
VITE_VOTING_FACTORY_ADDRESS=${votingFactoryAddress}
VITE_CHAIN_ID=${chainId}
VITE_NETWORK_NAME=${networkName}
VITE_RPC_URL=${rpcUrl}
`;
    fs.writeFileSync(envPath, newEnv);
    console.log("Frontend .env created with contract addresses!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
