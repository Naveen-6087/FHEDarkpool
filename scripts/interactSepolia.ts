import { ethers } from "hardhat";
import { FHEDarkPool } from "../types";

/**
 * Simplified interaction script for Sepolia
 * Note: Full FHE encryption requires FHEVM infrastructure
 * This script demonstrates the contract's public functions
 */
async function main() {
  console.log("FHEDarkPool Sepolia Interaction\n");
  console.log("=" .repeat(70));

  const DARKPOOL_ADDRESS = "0x9e24187B5941ddC24f349664f641daAFe0F083B4";

  // Get signers - use account 1 (your funded account)
  const signers = await ethers.getSigners();
  const deployer = signers[1];

  console.log(`\nYour Account: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Connect to deployed contract
  const darkPool = (await ethers.getContractAt(
    "FHEDarkPool",
    DARKPOOL_ADDRESS,
    deployer
  )) as FHEDarkPool;

  console.log(`\nDarkPool Contract: ${DARKPOOL_ADDRESS}`);
  console.log("=" .repeat(70));

  // ========== Check Contract State ==========
  console.log("\nChecking Contract State...\n");

  const admin = await darkPool.admin();
  const totalOrders = await darkPool.getTotalOrders();
  const totalMatches = await darkPool.getTotalMatches();
  const minAmount = await darkPool.MIN_ORDER_AMOUNT();
  const maxAmount = await darkPool.MAX_ORDER_AMOUNT();

  console.log(`   Admin: ${admin}`);
  console.log(`   Total Orders: ${totalOrders}`);
  console.log(`   Total Matches: ${totalMatches}`);
  console.log(`   Min Order Amount: ${minAmount}`);
  console.log(`   Max Order Amount: ${maxAmount}`);

  // ========== Check if user has balance ==========
  console.log("\nChecking User Balance Status...\n");

  const hasBalance = await darkPool.hasBalance(deployer.address);
  console.log(`   Has initialized balance: ${hasBalance}`);

  // ========== Get user orders ==========
  console.log("\nChecking User Orders...\n");

  const userOrders = await darkPool.getUserOrders(deployer.address);
  console.log(`   Total orders placed: ${userOrders.length}`);

  if (userOrders.length > 0) {
    console.log(`\n   Your Orders:`);
    for (let i = 0; i < userOrders.length; i++) {
      const orderId = userOrders[i];
      const order = await darkPool.getOrder(orderId);
      console.log(`\n   Order #${orderId}:`);
      console.log(`     Trader: ${order.trader}`);
      console.log(`     Active: ${order.isActive}`);
      console.log(`     Timestamp: ${new Date(Number(order.timestamp) * 1000).toLocaleString()}`);
    }
  }

  // ========== View on Etherscan ==========
  console.log("\n" + "=" .repeat(70));
  console.log("\nView Contract on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${DARKPOOL_ADDRESS}`);

  console.log("\n Available Hardhat Tasks:");
  console.log(`\n   Get stats:`);
  console.log(`   npx hardhat darkpool:get-stats --contract ${DARKPOOL_ADDRESS} --network sepolia`);
  
  console.log(`\n   Get your orders:`);
  console.log(`   npx hardhat darkpool:get-user-orders --contract ${DARKPOOL_ADDRESS} --network sepolia`);
  
  console.log(`\n   Check balance status:`);
  console.log(`   npx hardhat darkpool:has-balance --contract ${DARKPOOL_ADDRESS} --network sepolia`);

  console.log("\n" + "=" .repeat(70));
  console.log("\nContract interaction successful!");
  console.log("\nNote: Full encrypted operations (deposits, orders) require FHEVM");
  console.log("   infrastructure which is not available on standard Sepolia.");
  console.log("   For full FHE functionality, use FHEVM testnet or local mock.");
  console.log("\n" + "=" .repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nError:", error.message);
    process.exit(1);
  });
