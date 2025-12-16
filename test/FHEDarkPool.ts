import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEDarkPool, FHEDarkPool__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEDarkPool")) as FHEDarkPool__factory;
  const darkPool = (await factory.deploy()) as FHEDarkPool;
  const darkPoolAddress = await darkPool.getAddress();

  return { darkPool, darkPoolAddress };
}

describe("FHEDarkPool", function () {
  let signers: Signers;
  let darkPool: FHEDarkPool;
  let darkPoolAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This test suite requires FHEVM mock environment`);
      this.skip();
    }

    ({ darkPool, darkPoolAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("should set the correct admin", async function () {
      expect(await darkPool.admin()).to.equal(signers.deployer.address);
    });

    it("should initialize with zero orders", async function () {
      expect(await darkPool.orderCounter()).to.equal(0);
    });

    it("should initialize with zero matches", async function () {
      expect(await darkPool.totalMatches()).to.equal(0);
    });

    it("should have correct constants", async function () {
      expect(await darkPool.MIN_ORDER_AMOUNT()).to.equal(1);
      expect(await darkPool.MAX_ORDER_AMOUNT()).to.equal(1000000);
    });
  });

  describe("Balance Management", function () {
    it("should allow deposits", async function () {
      const depositAmount = 1000;
      const encryptedDeposit = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      const tx = await darkPool
        .connect(signers.alice)
        .depositFunds(encryptedDeposit.handles[0], encryptedDeposit.inputProof);

      await expect(tx).to.emit(darkPool, "FundsDeposited");
    });

    it("should track user balance after deposit", async function () {
      const depositAmount = 5000;
      const encryptedDeposit = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await darkPool.connect(signers.alice).depositFunds(encryptedDeposit.handles[0], encryptedDeposit.inputProof);

      const hasBalance = await darkPool.hasBalance(signers.alice.address);
      expect(hasBalance).to.be.true;
    });

    it("should accumulate multiple deposits", async function () {
      const deposit1 = 1000;
      const deposit2 = 2000;

      // First deposit
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(deposit1)
        .encrypt();
      await darkPool.connect(signers.alice).depositFunds(encrypted.handles[0], encrypted.inputProof);

      // Second deposit
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(deposit2)
        .encrypt();
      await darkPool.connect(signers.alice).depositFunds(encrypted.handles[0], encrypted.inputProof);

      const encryptedBalance = await darkPool.getEncryptedBalance(signers.alice.address);
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        darkPoolAddress,
        signers.alice,
      );

      expect(balance).to.equal(deposit1 + deposit2);
    });

    it("should allow withdrawals", async function () {
      // First deposit
      const depositAmount = 5000;
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();
      await darkPool.connect(signers.alice).depositFunds(encrypted.handles[0], encrypted.inputProof);

      // Then withdraw
      const withdrawAmount = 2000;
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(withdrawAmount)
        .encrypt();

      const tx = await darkPool
        .connect(signers.alice)
        .withdrawFunds(encrypted.handles[0], encrypted.inputProof);

      await expect(tx).to.emit(darkPool, "FundsWithdrawn");
    });

    it("should correctly update balance after withdrawal", async function () {
      const depositAmount = 5000;
      const withdrawAmount = 2000;

      // Deposit
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();
      await darkPool.connect(signers.alice).depositFunds(encrypted.handles[0], encrypted.inputProof);

      // Withdraw
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add64(withdrawAmount)
        .encrypt();
      await darkPool.connect(signers.alice).withdrawFunds(encrypted.handles[0], encrypted.inputProof);

      const encryptedBalance = await darkPool.getEncryptedBalance(signers.alice.address);
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        darkPoolAddress,
        signers.alice,
      );

      expect(balance).to.equal(depositAmount - withdrawAmount);
    });
  });

  describe("Order Placement", function () {
    it("should allow placing an order", async function () {
      const amount = 100;
      const price = 50;
      const isBuy = true;

      const encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(amount)
        .add32(price)
        .addBool(isBuy)
        .encrypt();

      const tx = await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx).to.emit(darkPool, "OrderPlaced").withArgs(0, signers.alice.address, block!.timestamp);
    });

    it("should increment order counter", async function () {
      const amount = 100;
      const price = 50;
      const isBuy = true;

      // Alice places an order
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(amount)
        .add32(price)
        .addBool(isBuy)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      expect(await darkPool.orderCounter()).to.equal(1);

      // Bob places another order - needs his own encrypted input
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.bob.address)
        .add32(amount)
        .add32(price)
        .addBool(isBuy)
        .encrypt();

      await darkPool
        .connect(signers.bob)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      expect(await darkPool.orderCounter()).to.equal(2);
    });

    it("should track user orders", async function () {
      const amount = 100;
      const price = 50;

      // Alice places 2 orders
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(amount)
        .add32(price)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      const aliceOrders = await darkPool.getUserOrders(signers.alice.address);
      expect(aliceOrders.length).to.equal(2);
      expect(aliceOrders[0]).to.equal(0);
      expect(aliceOrders[1]).to.equal(1);
    });

    it("should store order details correctly", async function () {
      const amount = 100;
      const price = 50;
      const isBuy = true;

      const encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(amount)
        .add32(price)
        .addBool(isBuy)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      const order = await darkPool.getOrder(0);
      expect(order.trader).to.equal(signers.alice.address);
      expect(order.isActive).to.be.true;
    });

    it("should allow multiple users to place orders", async function () {
      // Alice places order
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(100)
        .add32(50)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      // Bob places order - needs his own encrypted input
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.bob.address)
        .add32(100)
        .add32(50)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.bob)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      expect(await darkPool.getTotalOrders()).to.equal(2);

      const aliceOrders = await darkPool.getUserOrders(signers.alice.address);
      const bobOrders = await darkPool.getUserOrders(signers.bob.address);

      expect(aliceOrders.length).to.equal(1);
      expect(bobOrders.length).to.equal(1);
    });
  });

  describe("Order Cancellation", function () {
    beforeEach(async function () {
      // Place an order for Alice
      const encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(100)
        .add32(50)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);
    });

    it("should allow order owner to cancel", async function () {
      const tx = await darkPool.connect(signers.alice).cancelOrder(0);

      await expect(tx).to.emit(darkPool, "OrderCancelled").withArgs(0, signers.alice.address);
    });

    it("should mark order as inactive after cancellation", async function () {
      await darkPool.connect(signers.alice).cancelOrder(0);

      const order = await darkPool.getOrder(0);
      expect(order.isActive).to.be.false;
    });

    it("should not allow non-owner to cancel", async function () {
      await expect(darkPool.connect(signers.bob).cancelOrder(0)).to.be.revertedWithCustomError(
        darkPool,
        "NotOrderOwner",
      );
    });

    it("should not allow cancelling inactive order", async function () {
      await darkPool.connect(signers.alice).cancelOrder(0);

      await expect(darkPool.connect(signers.alice).cancelOrder(0)).to.be.revertedWithCustomError(
        darkPool,
        "OrderNotActive",
      );
    });
  });

  describe("Order Matching", function () {
    beforeEach(async function () {
      // Alice places a buy order (order 0)
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(100)
        .add32(50)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      // Bob places a sell order (order 1)
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.bob.address)
        .add32(100)
        .add32(45)
        .addBool(false)
        .encrypt();

      await darkPool
        .connect(signers.bob)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);
    });

    it("should allow admin to match orders", async function () {
      const tx = await darkPool.connect(signers.deployer).matchOrders(0, 1);

      await expect(tx).to.emit(darkPool, "OrderMatched");
    });

    it("should increment match counter", async function () {
      await darkPool.connect(signers.deployer).matchOrders(0, 1);

      expect(await darkPool.getTotalMatches()).to.equal(1);
    });

    it("should mark orders as inactive after matching", async function () {
      await darkPool.connect(signers.deployer).matchOrders(0, 1);

      const order0 = await darkPool.getOrder(0);
      const order1 = await darkPool.getOrder(1);

      expect(order0.isActive).to.be.false;
      expect(order1.isActive).to.be.false;
    });

    it("should not allow non-admin to match orders", async function () {
      await expect(darkPool.connect(signers.alice).matchOrders(0, 1)).to.be.revertedWithCustomError(
        darkPool,
        "OnlyAdmin",
      );
    });

    it("should not match inactive orders", async function () {
      // Cancel first order
      await darkPool.connect(signers.alice).cancelOrder(0);

      await expect(darkPool.connect(signers.deployer).matchOrders(0, 1)).to.be.revertedWithCustomError(
        darkPool,
        "OrderNotActive",
      );
    });
  });

  describe("Admin Functions", function () {
    it("should allow admin to update admin address", async function () {
      const tx = await darkPool.connect(signers.deployer).updateAdmin(signers.alice.address);

      await expect(tx)
        .to.emit(darkPool, "AdminUpdated")
        .withArgs(signers.deployer.address, signers.alice.address);

      expect(await darkPool.admin()).to.equal(signers.alice.address);
    });

    it("should not allow non-admin to update admin", async function () {
      await expect(darkPool.connect(signers.alice).updateAdmin(signers.bob.address)).to.be.revertedWithCustomError(
        darkPool,
        "OnlyAdmin",
      );
    });

    it("should not allow zero address as admin", async function () {
      await expect(
        darkPool.connect(signers.deployer).updateAdmin(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(darkPool, "InvalidAddress");
    });

    it("should allow new admin to perform admin functions", async function () {
      // Transfer admin to Alice
      await darkPool.connect(signers.deployer).updateAdmin(signers.alice.address);

      // Bob places order
      let encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.bob.address)
        .add32(100)
        .add32(50)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.bob)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      // Charlie places order - needs his own encrypted input
      encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.charlie.address)
        .add32(100)
        .add32(50)
        .addBool(false)
        .encrypt();

      await darkPool
        .connect(signers.charlie)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      // Alice (new admin) should be able to match orders
      await expect(darkPool.connect(signers.alice).matchOrders(0, 1)).to.emit(darkPool, "OrderMatched");
    });
  });

  describe("View Functions", function () {
    it("should return total orders count", async function () {
      expect(await darkPool.getTotalOrders()).to.equal(0);

      // Place an order
      const encrypted = await fhevm
        .createEncryptedInput(darkPoolAddress, signers.alice.address)
        .add32(100)
        .add32(50)
        .addBool(true)
        .encrypt();

      await darkPool
        .connect(signers.alice)
        .placeOrder(encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.inputProof);

      expect(await darkPool.getTotalOrders()).to.equal(1);
    });

    it("should return total matches count", async function () {
      expect(await darkPool.getTotalMatches()).to.equal(0);
    });

    it("should return false for uninitialized balance", async function () {
      expect(await darkPool.hasBalance(signers.alice.address)).to.be.false;
    });

    it("should return empty array for users with no orders", async function () {
      const orders = await darkPool.getUserOrders(signers.alice.address);
      expect(orders.length).to.equal(0);
    });
  });
});
