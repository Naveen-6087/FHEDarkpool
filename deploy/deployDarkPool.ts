import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying FHEDarkPool contract...");
  console.log("Deployer address:", deployer);

  const deployedDarkPool = await deploy("FHEDarkPool", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(` FHEDarkPool contract deployed at: ${deployedDarkPool.address}`);
  console.log(`Transaction hash: ${deployedDarkPool.transactionHash}`);
  console.log(`Gas used: ${deployedDarkPool.receipt?.gasUsed.toString()}`);

  // Display useful information
  console.log("\n Next Steps:");
  console.log(`1. Verify contract: npx hardhat verify --network ${hre.network.name} ${deployedDarkPool.address}`);
  console.log(`2. Interact with contract: npx hardhat darkpool:deposit --network ${hre.network.name}`);
  console.log(`3. Place an order: npx hardhat darkpool:place-order --network ${hre.network.name}`);
};

export default func;
func.id = "deploy_fheDarkPool";
func.tags = ["FHEDarkPool"];
