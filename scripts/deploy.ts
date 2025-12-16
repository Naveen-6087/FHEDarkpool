import { ethers } from "hardhat";

/**
 * Quick deployment script for FHEDarkPool
 */
async function main() {
  console.log("Deploying FHEDarkPool Contract...\n");

  const signers = await ethers.getSigners();
  const deployer = signers[1]; // Use account index 1 (your funded account)
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy contract with the specific signer
  const FHEDarkPool = await ethers.getContractFactory("FHEDarkPool", deployer);
  console.log("Deploying contract...");

  const darkPool = await FHEDarkPool.deploy();
  await darkPool.waitForDeployment();

  const address = await darkPool.getAddress();

  console.log("\nFHEDarkPool deployed successfully!");
  console.log("=" .repeat(60));
  console.log(`Contract Address: ${address}`);
  console.log(`Deployer (Admin): ${deployer.address}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log("=" .repeat(60));

  // Display contract info
  const admin = await darkPool.admin();
  const totalOrders = await darkPool.getTotalOrders();
  const totalMatches = await darkPool.getTotalMatches();

  console.log("\nInitial State:");
  console.log(`Admin: ${admin}`);
  console.log(`Total Orders: ${totalOrders}`);
  console.log(`Total Matches: ${totalMatches}`);

  console.log("\nNext Steps:");
  console.log(`1. Save contract address: export DARKPOOL_ADDRESS=${address}`);
  console.log(`2. Verify on explorer (if on testnet/mainnet)`);
  console.log(`3. Interact: npx hardhat run scripts/interact.ts --network <network>`);
  console.log(`4. Run tasks: npx hardhat darkpool:get-stats --contract ${address} --network <network>`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
