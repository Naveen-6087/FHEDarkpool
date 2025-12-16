# FHE DarkPool 🔒

> A fully homomorphic encryption (FHE) based dark pool for private order matching on Ethereum using Zama's FHEVM technology.

[![License](https://img.shields.io/badge/License-BSD--3--Clause--Clear-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-green.svg)](https://soliditylang.org/)
[![FHEVM](https://img.shields.io/badge/FHEVM-Zama-purple.svg)](https://docs.zama.ai/fhevm)

## 🌟 Overview

**FHEDarkPool** is a decentralized trading platform that enables **completely private** order matching. All order details (amounts, prices, order types) remain encrypted on-chain throughout the entire lifecycle, providing true confidentiality for traders.

### Key Features

- 🔐 **Fully Encrypted Orders**: Amounts, prices, and order types never leave encrypted form
- 🤝 **Private Matching**: Order matching logic runs on encrypted data using FHE operations
- 💰 **Encrypted Balances**: User balances are stored and managed in encrypted form
- 🔒 **Zero Knowledge to Public**: No information about trades is revealed to observers
- ⚡ **On-Chain Execution**: All logic runs directly on Ethereum (no off-chain dependencies)
- 🛡️ **Quantum Resistant**: Built on TFHE cryptography which is quantum-safe

## 📋 Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Smart Contract API](#smart-contract-api)
- [Testing](#testing)
- [Deployment](#deployment)
- [Usage Examples](#usage-examples)
- [Security](#security)

## 🏗️ Architecture

### How It Works

1. **Deposit Phase**: Users deposit funds (encrypted) to the dark pool
2. **Order Placement**: Traders place encrypted orders specifying:
   - Amount (euint32)
   - Price (euint32)
   - Order type - Buy/Sell (ebool)
3. **Matching**: Admin matches compatible orders using FHE comparisons:
   - Verifies order types match (buy vs sell)
   - Checks price compatibility (buy price ≥ sell price)
   - Validates amounts are equal
4. **Settlement**: Orders are marked as filled while maintaining privacy

### Technology Stack

- **Zama FHEVM**: Fully Homomorphic Encryption for Solidity
- **Hardhat**: Development environment and testing framework
- **TypeScript**: Type-safe scripts and tasks
- **Ethers.js v6**: Blockchain interaction library

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   npx hardhat vars set MNEMONIC

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

3. **Compile and test**

   ```bash
   npm run compile
   npm run test
   ```

4. **Deploy to local network**

   ```bash
   # Start a local FHEVM-ready node
   npx hardhat node
   # Deploy to local network
   npx hardhat deploy --network localhost
   ```

5. **Deploy to Sepolia Testnet**

   ```bash
   # Deploy to Sepolia
   npx hardhat deploy --network sepolia
   # Verify contract on Etherscan
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

6. **Test on Sepolia Testnet**

   ```bash
   # Once deployed, you can run a simple test on Sepolia.
   npx hardhat test --network sepolia
   ```

## 📁 Project Structure

```
fhevm-hardhat-template/
├── contracts/
│   ├── FHECounter.sol      # Example FHE counter (reference)
│   └── FHEDarkPool.sol     # Main dark pool contract ⭐
├── deploy/
│   ├── deploy.ts           # FHECounter deployment
│   └── deployDarkPool.ts   # DarkPool deployment ⭐
├── tasks/
│   ├── accounts.ts         # Account management
│   ├── FHECounter.ts       # Counter tasks
│   └── FHEDarkPool.ts      # DarkPool tasks ⭐
├── test/
│   ├── FHECounter.ts       # Counter tests
│   └── FHEDarkPool.ts      # DarkPool tests ⭐
├── scripts/
│   ├── deploy.ts           # Quick deployment script ⭐
│   └── interact.ts         # Interaction examples ⭐
├── hardhat.config.ts       # Hardhat configuration
└── package.json            # Dependencies
```

## � Smart Contract API

### Main Functions

#### `depositFunds(externalEuint64 encryptedAmount, bytes calldata inputProof)`
Deposit encrypted funds to your balance.

#### `withdrawFunds(externalEuint64 encryptedAmount, bytes calldata inputProof)`
Withdraw encrypted funds from your balance.

#### `placeOrder(externalEuint32 amount, externalEuint32 price, externalEbool isBuy, bytes calldata proof)`
Place a new encrypted order in the dark pool.

**Returns:** `uint256 orderId` - Unique identifier for the order

#### `matchOrders(uint256 buyOrderId, uint256 sellOrderId)` [Admin Only]
Match two compatible orders using encrypted comparison logic.

#### `cancelOrder(uint256 orderId)`
Cancel your active order.

#### `updateAdmin(address newAdmin)` [Admin Only]
Transfer admin privileges to a new address.

### View Functions

- `getEncryptedBalance(address user)` - Returns encrypted balance
- `getUserOrders(address user)` - Returns array of order IDs
- `getOrder(uint256 orderId)` - Returns order details
- `getTotalOrders()` - Returns total number of orders
- `getTotalMatches()` - Returns total matched orders
- `hasBalance(address user)` - Check if balance is initialized

### Events

```solidity
event OrderPlaced(uint256 indexed orderId, address indexed trader, uint256 timestamp);
event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 timestamp);
event OrderCancelled(uint256 indexed orderId, address indexed trader);
event FundsDeposited(address indexed user, uint256 timestamp);
event FundsWithdrawn(address indexed user, uint256 timestamp);
event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run DarkPool tests only
npx hardhat test test/FHEDarkPool.ts

# With gas reporting
REPORT_GAS=true npm test

# Coverage report
npm run coverage
```

### Test Coverage

The test suite includes comprehensive coverage:
- ✅ Deployment and initialization
- ✅ Balance management (deposits/withdrawals)
- ✅ Order placement and tracking
- ✅ Order cancellation
- ✅ Order matching logic
- ✅ Admin functions
- ✅ Access control
- ✅ Edge cases and error conditions

## 🌐 Deployment

### Deploy to Network

```bash
# Local development
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost

# Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Using deployment tasks
npx hardhat deploy --network sepolia --tags FHEDarkPool
```

### Verify Contract

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 💡 Usage Examples

### Interact with the Contract

```bash
# Set contract address
export DARKPOOL_ADDRESS=<your-deployed-address>

# Run interaction script
npx hardhat run scripts/interact.ts --network sepolia

# Check contract stats
npx hardhat darkpool:get-stats --contract $DARKPOOL_ADDRESS --network sepolia

# View user orders
npx hardhat darkpool:get-user-orders --contract $DARKPOOL_ADDRESS --network sepolia

# Cancel an order
npx hardhat darkpool:cancel-order --contract $DARKPOOL_ADDRESS --orderid 0 --network sepolia
```

### Example: Place an Order (TypeScript)

```typescript
import { ethers, fhevm } from "hardhat";

const darkPool = await ethers.getContractAt("FHEDarkPool", address);

// Create encrypted order: 100 tokens @ price 50 (BUY order)
const encrypted = await fhevm
  .createEncryptedInput(address, signer.address)
  .add32(100)   // amount
  .add32(50)    // price
  .addBool(true)  // isBuy
  .encrypt();

await darkPool.placeOrder(
  encrypted.handles[0],
  encrypted.handles[1],
  encrypted.handles[2],
  encrypted.inputProof
);
```

## 🛡️ Security

### Current Status

⚠️ **This is a demonstration/research project. NOT production-ready.**

### Known Limitations

1. Gateway integration for decryption is not fully implemented
2. No on-chain validation of sufficient balance before matching
3. Admin role is centralized (consider multi-sig for production)
4. No order expiration mechanism
5. No reentrancy guards implemented

### Production Recommendations

- ✅ Add reentrancy protection
- ✅ Implement Gateway callbacks for decryption
- ✅ Add comprehensive balance validation
- ✅ Implement multi-signature admin controls
- ✅ Add emergency pause functionality
- ✅ Professional security audit required
- ✅ Rate limiting on operations
- ✅ Time-based order expiration

## 📜 Available Scripts

| Script             | Description                     |
| ------------------ | ------------------------------- |
| `npm run compile`  | Compile all contracts           |
| `npm run test`     | Run all tests                   |
| `npm run coverage` | Generate coverage report        |
| `npm run lint`     | Run linting checks              |
| `npm run clean`    | Clean build artifacts           |
| `npm run deploy`   | Deploy to configured network    |

## 📚 Resources

### Zama Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM GitHub](https://github.com/zama-ai/fhevm)
- [Zama Whitepaper](https://github.com/zama-ai/fhevm/blob/main/fhevm-whitepaper.pdf)
- [FHEVM Examples](https://docs.zama.ai/fhevm/getting-started/example)

### Learning Resources

- [FHE Introduction](https://www.zama.ai/introduction-to-homomorphic-encryption)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [Awesome Zama](https://github.com/zama-ai/awesome-zama)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Add comments for complex logic

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 **GitHub Issues**: [Report bugs or request features](https://github.com/Naveen-6087/FHEDarkpool/issues)
- 📖 **Documentation**: [FHEVM Docs](https://docs.zama.ai/fhevm)
- 💬 **Community**: [Zama Discord](https://discord.gg/zama)
- 🌐 **Website**: [Zama.ai](https://www.zama.ai)

## 🙏 Acknowledgments

- **Zama** for the incredible FHEVM technology
- The FHE cryptography research community
- All contributors and testers

---

**⚠️ Disclaimer**: This is experimental software built for educational and research purposes. Use at your own risk. Not audited. Not for production use with real funds.

**Built with ❤️ using Zama's FHEVM**
