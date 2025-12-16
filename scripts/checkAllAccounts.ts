import { ethers } from "hardhat";

async function main() {
  console.log("\nChecking All Account Balances\n");
  console.log("=" .repeat(70));

  const signers = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  for (let i = 0; i < Math.min(5, signers.length); i++) {
    const signer = signers[i];
    const address = signer.address;
    const balance = await ethers.provider.getBalance(address);
    
    console.log(`Account ${i}: ${address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance >= ethers.parseEther("0.01")) {
      console.log(`Sufficient for deployment`);
    }
    console.log();
  }

  console.log("=" .repeat(70));
  
  // Check your specific account (index 1)
  const yourAccount = signers[1];
  const yourBalance = await ethers.provider.getBalance(yourAccount.address);
  
  console.log(`\n Your Account (Index 1): ${yourAccount.address}`);
  console.log(`Balance: ${ethers.formatEther(yourBalance)} ETH`);
  
  if (yourBalance >= ethers.parseEther("0.01")) {
    console.log(`Ready to deploy!\n`);
  } else {
    console.log(`Need more ETH for deployment\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
