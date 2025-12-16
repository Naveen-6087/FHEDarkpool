import { ethers, fhevm } from "hardhat";
import { FHEDarkPool } from "../types";

/**
 * Script to interact with FHEDarkPool contract
 * This demonstrates the basic flow of:
 * 1. Depositing funds
 * 2. Placing orders
 * 3. Viewing orders
 * 4. Matching orders (admin)
 */
async function main() {
  console.log("FHEDarkPool Interaction Script\n");
  console.log("=" .repeat(60));

  // Get signers - use account 1 as deployer (your funded account)
  const signers = await ethers.getSigners();
  const deployer = signers[1];
  const alice = signers[2];
  const bob = signers[3];

  console.log("\nAccounts:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Alice: ${alice.address}`);
  console.log(`Bob: ${bob.address}`);

  // Get deployed contract address
  const DARKPOOL_ADDRESS = process.env.DARKPOOL_ADDRESS || "0x9e24187B5941ddC24f349664f641daAFe0F083B4";

  if (!DARKPOOL_ADDRESS) {
    console.log("\nError: DARKPOOL_ADDRESS not set");
    console.log("Please set the contract address:");
    console.log("export DARKPOOL_ADDRESS=<your-contract-address>");
    return;
  }

  const darkPool = (await ethers.getContractAt("FHEDarkPool", DARKPOOL_ADDRESS)) as FHEDarkPool;

  console.log(`\nDarkPool Contract: ${DARKPOOL_ADDRESS}`);
  console.log("=" .repeat(60));

  // ========== Step 1: Check Initial State ==========
  console.log("\nChecking Initial State...");

  const admin = await darkPool.admin();
  const totalOrders = await darkPool.getTotalOrders();
  const totalMatches = await darkPool.getTotalMatches();

  console.log(`   Admin: ${admin}`);
  console.log(`   Total Orders: ${totalOrders}`);
  console.log(`   Total Matches: ${totalMatches}`);

  // ========== Step 2: Deposit Funds ==========
  console.log("\nDepositing Funds...");

  if (fhevm.isMock) {
    // Alice deposits 10000
    const aliceDeposit = 10000;
    console.log(`   Alice depositing: ${aliceDeposit} tokens (encrypted)`);

    const encryptedAliceDeposit = await fhevm
      .createEncryptedInput(DARKPOOL_ADDRESS, alice.address)
      .add64(aliceDeposit)
      .encrypt();

    let tx = await darkPool
      .connect(alice)
      .depositFunds(encryptedAliceDeposit.handles[0], encryptedAliceDeposit.inputProof);
    await tx.wait();
    console.log(`   Alice deposit confirmed`);

    // Bob deposits 10000
    const bobDeposit = 10000;
    console.log(`   Bob depositing: ${bobDeposit} tokens (encrypted)`);

    const encryptedBobDeposit = await fhevm
      .createEncryptedInput(DARKPOOL_ADDRESS, bob.address)
      .add64(bobDeposit)
      .encrypt();

    tx = await darkPool.connect(bob).depositFunds(encryptedBobDeposit.handles[0], encryptedBobDeposit.inputProof);
    await tx.wait();
    console.log(`   Bob deposit confirmed`);

    // Check balances
    const aliceHasBalance = await darkPool.hasBalance(alice.address);
    const bobHasBalance = await darkPool.hasBalance(bob.address);
    console.log(`   Alice has balance: ${aliceHasBalance}`);
    console.log(`   Bob has balance: ${bobHasBalance}`);
  } else {
    console.log(`   Skipping deposits (not in mock mode)`);
  }

  // ========== Step 3: Place Orders ==========
  console.log("\nPlacing Orders...");

  if (fhevm.isMock) {
    // Alice places a BUY order: 100 tokens @ price 50
    console.log(`   Alice placing BUY order: 100 tokens @ price 50`);

    const aliceOrder = await fhevm
      .createEncryptedInput(DARKPOOL_ADDRESS, alice.address)
      .add32(100) // amount
      .add32(50) // price
      .addBool(true) // isBuy = true
      .encrypt();

    let tx = await darkPool
      .connect(alice)
      .placeOrder(aliceOrder.handles[0], aliceOrder.handles[1], aliceOrder.handles[2], aliceOrder.inputProof);
    let receipt = await tx.wait();
    console.log(`   Alice's order placed (Order #0)`);

    // Bob places a SELL order: 100 tokens @ price 45
    console.log(`   Bob placing SELL order: 100 tokens @ price 45`);

    const bobOrder = await fhevm
      .createEncryptedInput(DARKPOOL_ADDRESS, bob.address)
      .add32(100) // amount
      .add32(45) // price
      .addBool(false) // isBuy = false (sell)
      .encrypt();

    tx = await darkPool
      .connect(bob)
      .placeOrder(bobOrder.handles[0], bobOrder.handles[1], bobOrder.handles[2], bobOrder.inputProof);
    receipt = await tx.wait();
    console.log(`   Bob's order placed (Order #1)`);
  } else {
    console.log(`   Skipping orders (not in mock mode)`);
  }

  // ========== Step 4: View Orders ==========
  console.log("\nViewing Orders...");

  const updatedTotalOrders = await darkPool.getTotalOrders();
  console.log(`   Total orders in pool: ${updatedTotalOrders}`);

  const aliceOrders = await darkPool.getUserOrders(alice.address);
  const bobOrders = await darkPool.getUserOrders(bob.address);

  console.log(`   Alice's orders: ${aliceOrders.length > 0 ? aliceOrders.join(", ") : "none"}`);
  console.log(`   Bob's orders: ${bobOrders.length > 0 ? bobOrders.join(", ") : "none"}`);

  // Get order details
  if (updatedTotalOrders > 0n) {
    for (let i = 0; i < Number(updatedTotalOrders); i++) {
      const order = await darkPool.getOrder(i);
      console.log(`\n   Order #${i}:`);
      console.log(`     Trader: ${order.trader}`);
      console.log(`     Active: ${order.isActive}`);
      console.log(`     Timestamp: ${new Date(Number(order.timestamp) * 1000).toLocaleString()}`);
      console.log(`     (Amount, Price, Type remain encrypted)`);
    }
  }

  // ========== Step 5: Match Orders (Admin Only) ==========
  console.log("\nMatching Orders (Admin Operation)...");

  if (updatedTotalOrders >= 2n && admin === deployer.address) {
    console.log(`   Admin matching Order #0 (Buy) with Order #1 (Sell)...`);

    const tx = await darkPool.connect(deployer).matchOrders(0, 1);
    await tx.wait();

    console.log(`   Orders matched successfully!`);

    const newTotalMatches = await darkPool.getTotalMatches();
    console.log(`   Total matches: ${newTotalMatches}`);

    // Check order status
    const order0 = await darkPool.getOrder(0);
    const order1 = await darkPool.getOrder(1);
    console.log(`   Order #0 active: ${order0.isActive}`);
    console.log(`   Order #1 active: ${order1.isActive}`);
  } else {
    console.log(`   Skipping match (insufficient orders or not admin)`);
  }

  // ========== Summary ==========
  console.log("\n" + "=" .repeat(60));
  console.log("Interaction Complete!\n");

  const finalStats = {
    totalOrders: await darkPool.getTotalOrders(),
    totalMatches: await darkPool.getTotalMatches(),
    admin: await darkPool.admin(),
  };

  console.log("Final Statistics:");
  console.log(`   Total Orders: ${finalStats.totalOrders}`);
  console.log(`   Total Matches: ${finalStats.totalMatches}`);
  console.log(`   Admin: ${finalStats.admin}`);
  console.log("\n" + "=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nError:", error);
    process.exit(1);
  });
