import { ethers } from "hardhat";

async function main() {
  console.log("\nChecking Account Balance\n");
  console.log("=" .repeat(60));

  const [signer] = await ethers.getSigners();
  const address = signer.address;
  const balance = await ethers.provider.getBalance(address);
  const network = await ethers.provider.getNetwork();

  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Address: ${address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Wei: ${balance.toString()}`);
  console.log("=" .repeat(60));

  const minRequired = ethers.parseEther("0.01");
  
  if (balance < minRequired) {
    console.log("\nWARNING: Balance is below 0.01 ETH");
    console.log("You may not have enough for contract deployment.");
    console.log("\nGet Sepolia ETH from:");
    console.log("  • https://www.alchemy.com/faucets/ethereum-sepolia");
    console.log("  • https://www.infura.io/faucet/sepolia");
    console.log("  • https://sepolia-faucet.pk910.de/");
  } else {
    console.log("\nBalance sufficient for deployment!");
  }

  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
