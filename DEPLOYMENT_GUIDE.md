# 🚀 Deployment Guide - FHE DarkPool

## Prerequisites

Before deploying to Sepolia, you need:

1. **Sepolia ETH** - At least 0.01 ETH for gas fees
2. **Wallet with funds** - Either use your own wallet or fund the test wallet
3. **API Keys** - Already configured ✅
   - Infura API Key: Set ✅
   - Etherscan API Key: Set ✅

## Option 1: Use Your Own Wallet (Recommended)

If you have a MetaMask wallet with Sepolia ETH:

```bash
# Set your wallet's mnemonic (12 or 24 word seed phrase)
npx hardhat vars set MNEMONIC "your twelve or twenty four word mnemonic phrase here"

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

## Option 2: Fund the Test Wallet

Current test wallet address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

Get Sepolia ETH from these faucets:
- **Alchemy Sepolia Faucet**: https://www.alchemy.com/faucets/ethereum-sepolia
- **Infura Sepolia Faucet**: https://www.infura.io/faucet/sepolia
- **Sepolia PoW Faucet**: https://sepolia-faucet.pk910.de/
- **Google Cloud Faucet**: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

Once funded:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Deployment Steps

### 1. Verify Configuration

```bash
# Check your variables are set
npx hardhat vars list

# Check your account balance
npx hardhat run scripts/checkBalance.ts --network sepolia
```

### 2. Deploy Contract

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Expected output:
```
🚀 Deploying FHEDarkPool Contract...
Deploying with account: 0x...
Account balance: X.XX ETH
Deploying contract...

✅ FHEDarkPool deployed successfully!
============================================================
Contract Address: 0x...
Deployer (Admin): 0x...
Network: sepolia
============================================================
```

### 3. Verify on Etherscan

After deployment, verify your contract:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### 4. Interact with Contract

```bash
# Get contract stats
npx hardhat darkpool:get-stats --contract <CONTRACT_ADDRESS> --network sepolia

# Run interaction script
npx hardhat run scripts/interact.ts --network sepolia
```

## Using Hardhat Tasks

Once deployed, you can use these tasks:

```bash
# Get admin address
npx hardhat darkpool:get-admin --contract <ADDRESS> --network sepolia

# Get your orders
npx hardhat darkpool:get-user-orders --contract <ADDRESS> --network sepolia

# Check if you have balance
npx hardhat darkpool:has-balance --contract <ADDRESS> --network sepolia

# Cancel an order
npx hardhat darkpool:cancel-order --contract <ADDRESS> --orderid 0 --network sepolia

# Update admin (admin only)
npx hardhat darkpool:update-admin --contract <ADDRESS> --newadmin <NEW_ADDRESS> --network sepolia
```

## Testing Before Deployment

Test locally first:

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/FHEDarkPool.ts

# Deploy to local network
npx hardhat node
# In another terminal:
npx hardhat run scripts/deploy.ts --network localhost
```

## Important Notes

⚠️ **Security Warning**: Never commit your mnemonic or private keys to git!

✅ **Gas Costs**: Deployment typically costs ~0.005-0.01 ETH on Sepolia

🔒 **FHE Operations**: The contract uses Zama's FHE library for encrypted computations

## Troubleshooting

### "Insufficient funds" error
- Get Sepolia ETH from faucets listed above
- Check balance: `npx hardhat run scripts/checkBalance.ts --network sepolia`

### "Invalid mnemonic" error
- Ensure you set the correct mnemonic phrase
- Mnemonic should be 12 or 24 words separated by spaces

### "Network error" or timeout
- Check your internet connection
- Verify Infura API key is correct
- Try again after a few seconds

### Contract verification fails
- Wait a few minutes after deployment
- Ensure Etherscan API key is correct
- Check the contract was successfully deployed

## Next Steps After Deployment

1. **Save the contract address** - You'll need it for interactions
2. **Verify on Etherscan** - Makes the contract publicly verifiable
3. **Test interactions** - Use the interact script or tasks
4. **Share the address** - Others can interact with your DarkPool

## Contract Features

Once deployed, your FHE DarkPool supports:
- 🔐 Encrypted balance deposits and withdrawals
- 📝 Private order placement (amounts, prices, types all encrypted)
- 🔄 Confidential order matching
- 👥 Multi-user trading without revealing trade details
- 🛡️ Full privacy using Fully Homomorphic Encryption

Happy deploying! 🎉
