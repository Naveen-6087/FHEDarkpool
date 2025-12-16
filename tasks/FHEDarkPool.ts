import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("darkpool:deploy")
  .setDescription("Deploy the FHEDarkPool contract")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    console.log(" Deploying FHEDarkPool...");
    
    const darkPool = await deploy("FHEDarkPool", {
      from: deployer,
      log: true,
    });

    console.log(` FHEDarkPool deployed at: ${darkPool.address}`);
  });

task("darkpool:get-admin")
  .setDescription("Get the admin address of the FHEDarkPool")
  .addParam("contract", "The address of the FHEDarkPool contract")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract } = taskArguments;
    const { ethers, deployments } = hre;

    const darkPool = await ethers.getContractAt("FHEDarkPool", contract);
    const admin = await darkPool.admin();

    console.log(`Admin address: ${admin}`);
  });

task("darkpool:get-stats")
  .setDescription("Get statistics from the FHEDarkPool")
  .addParam("contract", "The address of the FHEDarkPool contract")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract } = taskArguments;
    const { ethers } = hre;

    const darkPool = await ethers.getContractAt("FHEDarkPool", contract);
    
    const totalOrders = await darkPool.getTotalOrders();
    const totalMatches = await darkPool.getTotalMatches();
    const admin = await darkPool.admin();

    console.log("\n FHEDarkPool Statistics");
    console.log("=" .repeat(50));
    console.log(`Contract Address: ${contract}`);
    console.log(`Admin: ${admin}`);
    console.log(`Total Orders: ${totalOrders.toString()}`);
    console.log(`Total Matches: ${totalMatches.toString()}`);
    console.log("=" .repeat(50));
  });

task("darkpool:get-user-orders")
  .setDescription("Get all orders for a user")
  .addParam("contract", "The address of the FHEDarkPool contract")
  .addOptionalParam("user", "The user address (defaults to signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract, user } = taskArguments;
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    const userAddress = user || signer.address;
    const darkPool = await ethers.getContractAt("FHEDarkPool", contract);
    
    const orderIds = await darkPool.getUserOrders(userAddress);

    console.log(`\n Orders for ${userAddress}:`);
    console.log(`Total orders: ${orderIds.length}`);
    
    for (const orderId of orderIds) {
      const order = await darkPool.getOrder(orderId);
      console.log(`\nOrder #${orderId}:`);
      console.log(`  Trader: ${order.trader}`);
      console.log(`  Active: ${order.isActive}`);
      console.log(`  Timestamp: ${new Date(Number(order.timestamp) * 1000).toLocaleString()}`);
    }
  });

task("darkpool:cancel-order")
  .setDescription("Cancel an order")
  .addParam("contract", "The address of the FHEDarkPool contract")
  .addParam("orderid", "The order ID to cancel")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract, orderid } = taskArguments;
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    const darkPool = await ethers.getContractAt("FHEDarkPool", contract);
    
    console.log(`Cancelling order #${orderid}...`);
    const tx = await darkPool.cancelOrder(orderid);
    const receipt = await tx.wait();

    console.log(` Order cancelled!`);
    console.log(`Transaction hash: ${receipt?.hash}`);
  });

task("darkpool:update-admin")
  .setDescription("Update the admin address (only admin)")
  .addParam("contract", "The address of the FHEDarkPool contract")
  .addParam("newadmin", "The new admin address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract, newadmin } = taskArguments;
    const { ethers } = hre;

    const darkPool = await ethers.getContractAt("FHEDarkPool", contract);
    
    console.log(`Updating admin to: ${newadmin}...`);
    const tx = await darkPool.updateAdmin(newadmin);
    const receipt = await tx.wait();

    console.log(` Admin updated!`);
    console.log(`Transaction hash: ${receipt?.hash}`);
  });

task("darkpool:has-balance")
  .setDescription("Check if a user has initialized balance")
  .addParam("contract", "The address of the FHEDarkPool contract")
  .addOptionalParam("user", "The user address (defaults to signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract, user } = taskArguments;
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    const userAddress = user || signer.address;
    const darkPool = await ethers.getContractAt("FHEDarkPool", contract);
    
    const hasBalance = await darkPool.hasBalance(userAddress);

    console.log(`User ${userAddress} has ${hasBalance ? "initialized" : "no"} balance`);
  });
