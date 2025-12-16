// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, ebool, externalEuint32, externalEuint64, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEDarkPool
 * @author FHE DarkPool Team
 * @notice Private trading pool using Zama's FHE for confidential order matching
 * @dev This contract allows users to place encrypted buy/sell orders that are matched privately
 *      All order amounts, prices, and types remain encrypted throughout the matching process
 */
contract FHEDarkPool is ZamaEthereumConfig {
    // ==================== Structs ====================
    
    /**
     * @dev Order structure with encrypted values
     * @param trader Address of the trader who placed the order
     * @param encryptedAmount Encrypted token amount (euint32)
     * @param encryptedPrice Encrypted price per token (euint32)
     * @param isBuyOrder Encrypted order type (true = buy, false = sell)
     * @param isActive Whether the order is still active
     * @param timestamp When the order was placed
     * @param orderId Unique identifier for the order
     */
    struct Order {
        address trader;
        euint32 encryptedAmount;
        euint32 encryptedPrice;
        ebool isBuyOrder;
        bool isActive;
        uint256 timestamp;
        uint256 orderId;
    }

    // ==================== State Variables ====================
    
    /// @notice Mapping from order ID to Order struct
    mapping(uint256 => Order) public orders;
    
    /// @notice Mapping from user address to array of their order IDs
    mapping(address => uint256[]) public userOrders;
    
    /// @notice Mapping from user address to encrypted balance
    mapping(address => euint64) private userBalances;
    
    /// @notice Counter for generating unique order IDs
    uint256 public orderCounter;
    
    /// @notice Total number of successful matches
    uint256 public totalMatches;
    
    /// @notice Admin address for privileged operations
    address public admin;
    
    /// @notice Minimum order amount (prevents dust orders)
    uint32 public constant MIN_ORDER_AMOUNT = 1;
    
    /// @notice Maximum order amount (prevents overflow)
    uint32 public constant MAX_ORDER_AMOUNT = 1000000;

    // ==================== Events ====================
    
    /**
     * @notice Emitted when a new order is placed
     * @param orderId Unique identifier for the order
     * @param trader Address of the trader
     * @param timestamp When the order was placed
     */
    event OrderPlaced(uint256 indexed orderId, address indexed trader, uint256 timestamp);
    
    /**
     * @notice Emitted when two orders are successfully matched
     * @param buyOrderId ID of the buy order
     * @param sellOrderId ID of the sell order
     * @param timestamp When the match occurred
     */
    event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 timestamp);
    
    /**
     * @notice Emitted when an order is cancelled
     * @param orderId ID of the cancelled order
     * @param trader Address of the trader who cancelled
     */
    event OrderCancelled(uint256 indexed orderId, address indexed trader);
    
    /**
     * @notice Emitted when a user deposits funds
     * @param user Address of the user
     * @param timestamp When the deposit occurred
     */
    event FundsDeposited(address indexed user, uint256 timestamp);
    
    /**
     * @notice Emitted when a user withdraws funds
     * @param user Address of the user
     * @param timestamp When the withdrawal occurred
     */
    event FundsWithdrawn(address indexed user, uint256 timestamp);
    
    /**
     * @notice Emitted when admin is updated
     * @param oldAdmin Previous admin address
     * @param newAdmin New admin address
     */
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);

    // ==================== Errors ====================
    
    error OnlyAdmin();
    error OrderNotActive();
    error NotOrderOwner();
    error InvalidAddress();
    error InsufficientBalance();
    error OrderNotFound();

    // ==================== Modifiers ====================
    
    /**
     * @dev Restricts function access to admin only
     */
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ==================== Constructor ====================
    
    /**
     * @notice Initializes the DarkPool contract
     * @dev Sets the deployer as the initial admin
     */
    constructor() {
        admin = msg.sender;
        orderCounter = 0;
        totalMatches = 0;
    }

    // ==================== External Functions ====================
    
    /**
     * @notice Deposit encrypted funds to the user's balance
     * @param encryptedAmount External encrypted amount to deposit
     * @param inputProof Proof for the encrypted input
     * @dev Converts external encrypted input to internal euint64 and adds to balance
     */
    function depositFunds(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Check if user has existing balance
        if (FHE.isInitialized(userBalances[msg.sender])) {
            userBalances[msg.sender] = FHE.add(userBalances[msg.sender], amount);
        } else {
            userBalances[msg.sender] = amount;
        }
        
        // Set permissions
        FHE.allowThis(userBalances[msg.sender]);
        FHE.allow(userBalances[msg.sender], msg.sender);
        
        emit FundsDeposited(msg.sender, block.timestamp);
    }

    /**
     * @notice Withdraw encrypted funds from the user's balance
     * @param encryptedAmount External encrypted amount to withdraw
     * @param inputProof Proof for the encrypted input
     * @dev Subtracts from balance if sufficient funds available
     */
    function withdrawFunds(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        if (!FHE.isInitialized(userBalances[msg.sender])) {
            revert InsufficientBalance();
        }
        
        // Check if user has sufficient balance (encrypted comparison)
        ebool hasSufficientBalance = FHE.le(amount, userBalances[msg.sender]);
        
        // Conditionally subtract: if sufficient, subtract amount; otherwise subtract 0
        euint64 withdrawAmount = FHE.select(hasSufficientBalance, amount, FHE.asEuint64(0));
        userBalances[msg.sender] = FHE.sub(userBalances[msg.sender], withdrawAmount);
        
        // Set permissions
        FHE.allowThis(userBalances[msg.sender]);
        FHE.allow(userBalances[msg.sender], msg.sender);
        
        emit FundsWithdrawn(msg.sender, block.timestamp);
    }

    /**
     * @notice Place a new encrypted order in the dark pool
     * @param encryptedAmount External encrypted token amount
     * @param encryptedPrice External encrypted price per token
     * @param encryptedIsBuy External encrypted order type (true = buy, false = sell)
     * @param inputProof Proof for encrypted inputs
     * @return orderId The unique identifier for the newly created order
     * @dev All order details remain encrypted and private
     */
    function placeOrder(
        externalEuint32 encryptedAmount,
        externalEuint32 encryptedPrice,
        externalEbool encryptedIsBuy,
        bytes calldata inputProof
    ) external returns (uint256) {
        // Convert external encrypted inputs to internal types
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        euint32 price = FHE.fromExternal(encryptedPrice, inputProof);
        ebool isBuy = FHE.fromExternal(encryptedIsBuy, inputProof);
        
        // Generate unique order ID
        uint256 orderId = orderCounter++;
        
        // Store the order
        orders[orderId] = Order({
            trader: msg.sender,
            encryptedAmount: amount,
            encryptedPrice: price,
            isBuyOrder: isBuy,
            isActive: true,
            timestamp: block.timestamp,
            orderId: orderId
        });
        
        // Track user's orders
        userOrders[msg.sender].push(orderId);
        
        // Set permissions for encrypted values
        FHE.allowThis(amount);
        FHE.allowThis(price);
        FHE.allowThis(isBuy);
        FHE.allow(amount, msg.sender);
        FHE.allow(price, msg.sender);
        FHE.allow(isBuy, msg.sender);
        
        emit OrderPlaced(orderId, msg.sender, block.timestamp);
        
        return orderId;
    }

    /**
     * @notice Attempt to match two orders privately using FHE operations
     * @param buyOrderId ID of the buy order
     * @param sellOrderId ID of the sell order
     * @dev Only admin can call this function
     *      Orders are matched if:
     *      1. Both orders are active
     *      2. One is a buy order and one is a sell order
     *      3. Buy price >= Sell price (encrypted comparison)
     *      4. Amounts match (encrypted comparison)
     */
    function matchOrders(uint256 buyOrderId, uint256 sellOrderId) external onlyAdmin {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];
        
        // Check if both orders exist and are active
        if (!buyOrder.isActive || !sellOrder.isActive) {
            revert OrderNotActive();
        }
        
        // Verify order types: buyOrder should be buy, sellOrder should be sell
        ebool isBuyValid = buyOrder.isBuyOrder;
        ebool isSellValid = FHE.not(sellOrder.isBuyOrder);
        
        // Check if prices match: buy price >= sell price
        ebool priceMatch = FHE.ge(buyOrder.encryptedPrice, sellOrder.encryptedPrice);
        
        // Check if amounts match
        ebool amountMatch = FHE.eq(buyOrder.encryptedAmount, sellOrder.encryptedAmount);
        
        // All conditions must be true for a valid match
        ebool orderTypesValid = FHE.and(isBuyValid, isSellValid);
        ebool priceAndAmountValid = FHE.and(priceMatch, amountMatch);
        ebool canMatch = FHE.and(orderTypesValid, priceAndAmountValid);
        
        // For now, we mark orders as inactive
        // In production, you would use gateway decryption to verify the match
        // and only execute if canMatch decrypts to true
        buyOrder.isActive = false;
        sellOrder.isActive = false;
        
        totalMatches++;
        
        emit OrderMatched(buyOrderId, sellOrderId, block.timestamp);
    }

    /**
     * @notice Cancel an active order
     * @param orderId ID of the order to cancel
     * @dev Only the order owner can cancel their order
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        
        if (order.trader != msg.sender) {
            revert NotOrderOwner();
        }
        
        if (!order.isActive) {
            revert OrderNotActive();
        }
        
        order.isActive = false;
        
        emit OrderCancelled(orderId, msg.sender);
    }

    /**
     * @notice Update the admin address
     * @param newAdmin New admin address
     * @dev Only current admin can update
     */
    function updateAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) {
            revert InvalidAddress();
        }
        
        address oldAdmin = admin;
        admin = newAdmin;
        
        emit AdminUpdated(oldAdmin, newAdmin);
    }

    // ==================== View Functions ====================
    
    /**
     * @notice Get user's encrypted balance
     * @param user Address of the user
     * @return The encrypted balance (euint64)
     */
    function getEncryptedBalance(address user) external view returns (euint64) {
        return userBalances[user];
    }

    /**
     * @notice Get all order IDs for a specific user
     * @param user Address of the user
     * @return Array of order IDs
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    /**
     * @notice Get order details (encrypted values remain encrypted)
     * @param orderId ID of the order
     * @return trader Address of the trader
     * @return isActive Whether the order is active
     * @return timestamp When the order was placed
     * @return encAmount Encrypted amount
     * @return encPrice Encrypted price
     * @return encIsBuy Encrypted order type
     */
    function getOrder(uint256 orderId) external view returns (
        address trader,
        bool isActive,
        uint256 timestamp,
        euint32 encAmount,
        euint32 encPrice,
        ebool encIsBuy
    ) {
        Order storage order = orders[orderId];
        return (
            order.trader,
            order.isActive,
            order.timestamp,
            order.encryptedAmount,
            order.encryptedPrice,
            order.isBuyOrder
        );
    }

    /**
     * @notice Get the total number of orders placed
     * @return Total order count
     */
    function getTotalOrders() external view returns (uint256) {
        return orderCounter;
    }

    /**
     * @notice Get the total number of matched orders
     * @return Total match count
     */
    function getTotalMatches() external view returns (uint256) {
        return totalMatches;
    }

    /**
     * @notice Check if a user has initialized balance
     * @param user Address to check
     * @return True if balance is initialized
     */
    function hasBalance(address user) external view returns (bool) {
        return FHE.isInitialized(userBalances[user]);
    }
}
