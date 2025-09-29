# Velo Multi-Chain Wallet API Documentation

## Table of Contents

-   [Overview](#overview)
-   [Base URL](#base-url)
-   [Authentication](#authentication)
-   [Error Handling](#error-handling)
-   [Authentication Endpoints](#authentication-endpoints)
-   [User Management](#user-management)
-   [Wallet Endpoints](#wallet-endpoints)
-   [Notification Endpoints](#notification-endpoints)
-   [Transaction History](#transaction-history)
-   [Response Examples](#response-examples)
-   [Deposit Checking](#deposit-checking)
-   [Send Transactions](#send-transactions)

---

## Overview

The Velo API provides comprehensive multi-chain wallet functionality supporting Ethereum (ETH), Bitcoin (BTC), Solana (SOL), Starknet (STRK), and USDT (ERC20/TRC20). This RESTful API enables user registration, authentication, wallet management, notifications, transaction history, **automatic deposit detection**, and **sending funds to any address**.

## Base URL

```
http://localhost:5500
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

All errors follow a consistent format:

```json
{
    "error": "Error message description"
}
```

Common HTTP status codes:

-   `200` - Success
-   `201` - Created
-   `400` - Bad Request
-   `401` - Unauthorized
-   `404` - Not Found
-   `409` - Conflict
-   `500` - Internal Server Error

---

# Authentication Endpoints

## 1. User Registration

**Endpoint:** `POST /auth/register`

**Description:** Register a new user and automatically generate wallet addresses for all supported chains (ETH, BTC, SOL, STRK, USDT ERC20, USDT TRC20) on both mainnet and testnet.

**Request Body:**

```json
{
    "email": "user@example.com",
    "password": "SecurePassword123"
}
```

**Response (201):**

```json
{
    "message": "User registered successfully. Please verify your email.",
    "userId": "86f44491-021b-41a7-8c64-726a642c1257",
    "addresses": [
        {
            "chain": "ethereum",
            "network": "mainnet",
            "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47"
        },
        {
            "chain": "bitcoin",
            "network": "mainnet",
            "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        // ... more addresses
    ]
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:5500/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

---

## 2. User Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and receive JWT tokens.

**Request Body:**

```json
{
    "email": "user@example.com",
    "password": "SecurePassword123"
}
```

**Response (200):**

```json
{
    "message": "Login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "86f44491-021b-41a7-8c64-726a642c1257",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "isEmailVerified": false
    }
}
```

---

## 3. Verify OTP

**Endpoint:** `POST /auth/verify-otp`

**Description:** Verify email using OTP sent during registration.

**Request Body:**

```json
{
    "email": "user@example.com",
    "otp": "123456"
}
```

**Response (200):**

```json
{
    "message": "Email verified successfully"
}
```

---

## 4. Resend OTP

**Endpoint:** `POST /auth/resend-otp`

**Description:** Resend OTP for email verification.

**Request Body:**

```json
{
    "email": "user@example.com"
}
```

**Response (200):**

```json
{
    "message": "OTP sent successfully"
}
```

---

## 5. Refresh Token

**Endpoint:** `POST /auth/refresh-token`

**Description:** Get new access token using refresh token.

**Request Body:**

```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 6. Logout

**Endpoint:** `POST /auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Description:** Logout from current device.

**Response (200):**

```json
{
    "message": "Logged out successfully"
}
```

---

## 7. Logout All Devices

**Endpoint:** `POST /auth/logout-all`

**Headers:** `Authorization: Bearer <token>`

**Description:** Logout from all devices.

**Response (200):**

```json
{
    "message": "Logged out from all devices successfully"
}
```

---

## 8. Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Description:** Initiate password reset process. Sends a 6-digit reset code to the user's email.

**Request Body:**

```json
{
    "email": "user@example.com"
}
```

**Response (200):**

```json
{
    "message": "If the email exists, you will receive a password reset link"
}
```

**Notes:**

-   For security, the same response is returned whether the email exists or not
-   Reset code expires in 15 minutes
-   Only one active reset token per user at a time

---

## 9. Verify Reset Token

**Endpoint:** `POST /auth/verify-reset-token`

**Description:** Verify if a password reset token is valid and not expired.

**Request Body:**

```json
{
    "email": "user@example.com",
    "token": "123456"
}
```

**Response (200):**

```json
{
    "message": "Reset token is valid",
    "canResetPassword": true
}
```

**Response (400):**

```json
{
    "error": "Invalid or expired reset token"
}
```

---

## 10. Reset Password

**Endpoint:** `POST /auth/reset-password`

**Description:** Reset user password using the reset token.

**Request Body:**

```json
{
    "email": "user@example.com",
    "token": "123456",
    "newPassword": "newPassword123"
}
```

**Response (200):**

```json
{
    "message": "Password reset successfully. Please log in with your new password."
}
```

**Response (400):**

```json
{
    "error": "Invalid or expired reset token"
}
```

**Notes:**

-   Password must be at least 6 characters long
-   All existing refresh tokens are revoked for security
-   User will need to log in again on all devices
-   Confirmation email is sent after successful reset

---

# User Management

## 1. Get User Profile

**Endpoint:** `GET /user/profile`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
    "user": {
        "id": "86f44491-021b-41a7-8c64-726a642c1257",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+1234567890",
        "isEmailVerified": true,
        "createdAt": "2025-09-20T10:00:00.000Z"
    }
}
```

---

## 2. Update User Profile

**Endpoint:** `PUT /user/profile`

**Headers:** `Authorization: Bearer <token>`

**Request Body (All fields optional):**

```json
{
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+1234567890",
    "username": "jane_smith_2024",
    "displayPicture": "https://example.com/profile.jpg",
    "bankName": "Wells Fargo",
    "accountNumber": "9876543210",
    "accountName": "Jane Smith"
}
```

**Response (200):**

```json
{
    "message": "Profile updated successfully",
    "user": {
        "id": "86f44491-021b-41a7-8c64-726a642c1257",
        "email": "user@example.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "phoneNumber": "+1234567890",
        "username": "jane_smith_2024",
        "displayPicture": "https://example.com/profile.jpg",
        "bankDetails": {
            "bankName": "Wells Fargo",
            "accountNumber": "9876543210",
            "accountName": "Jane Smith"
        }
    }
}
```

**Username Validation:**

-   Length: 3-30 characters
-   Characters: Letters, numbers, underscores only
-   Must be unique across all users
-   No consecutive underscores allowed

**Additional Endpoints:**

-   `GET /user/username/:username/availability` - Check username availability
-   `GET /user/username/suggestions` - Get username suggestions

---

# Wallet Endpoints

## 1. Get All Wallet Addresses

**Endpoint:** `GET /wallet/addresses`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get all wallet addresses grouped by chain.

**Response (200):**

```json
{
    "message": "Wallet addresses retrieved successfully",
    "addresses": {
        "ETH": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "chain": "ETH",
                "network": "MAINNET",
                "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
                "addedAt": "2025-09-20T10:30:00.000Z"
            }
        ],
        "BTC": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "chain": "BTC",
                "network": "MAINNET",
                "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "addedAt": "2025-09-20T10:30:00.000Z"
            }
        ]
    },
    "totalCount": 8
}
```

---

## 2. Get Testnet Addresses

**Endpoint:** `GET /wallet/addresses/testnet`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get only testnet addresses (simplified format).

**Response (200):**

```json
{
    "message": "Testnet addresses retrieved successfully",
    "addresses": [
        {
            "chain": "ETH",
            "address": "0x8ba1f109551bD432803012645Hac136c5d96c0B9"
        },
        {
            "chain": "BTC",
            "address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
        },
        {
            "chain": "SOL",
            "address": "11111111111111111111111111111112"
        },
        {
            "chain": "STRK",
            "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
        }
    ]
}
```

---

## 3. Get Mainnet Addresses

**Endpoint:** `GET /wallet/addresses/mainnet`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get only mainnet addresses (simplified format).

**Response (200):**

```json
{
    "message": "Mainnet addresses retrieved successfully",
    "addresses": [
        {
            "chain": "ETH",
            "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47"
        },
        {
            "chain": "BTC",
            "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        },
        {
            "chain": "SOL",
            "address": "11111111111111111111111111111112"
        },
        {
            "chain": "STRK",
            "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
        }
    ]
}
```

---

## 4. Get Wallet Balances

**Endpoint:** `GET /wallet/balances`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

-   `network` (optional): Filter by network (mainnet/testnet)

**Description:** Get balances for all user wallet addresses.

**Response (200):**

```json
{
    "balances": [
        {
            "chain": "ETH",
            "network": "mainnet",
            "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
            "balance": "2.5",
            "currency": "ETH",
            "usdValue": "4250.00"
        },
        {
            "chain": "BTC",
            "network": "mainnet",
            "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "balance": "0.1",
            "currency": "BTC",
            "usdValue": "2700.00"
        }
    ]
}
```

## 5. Get Testnet Balances

**Endpoint:** `GET /wallet/balances/testnet`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get balances for all user testnet addresses only.

**Response (200):**

```json
{
    "message": "Testnet balances retrieved successfully",
    "balances": [
        {
            "chain": "ethereum",
            "network": "testnet",
            "address": "0x1234567890123456789012345678901234567890",
            "balance": "1.5",
            "symbol": "ETH"
        },
        {
            "chain": "bitcoin",
            "network": "testnet",
            "address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
            "balance": "0.001",
            "symbol": "BTC"
        },
        {
            "chain": "solana",
            "network": "testnet",
            "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "balance": "10.0",
            "symbol": "SOL"
        },
        {
            "chain": "starknet",
            "network": "testnet",
            "address": "0x123...abc",
            "balance": "5.0",
            "symbol": "STRK"
        },
        {
            "chain": "usdt_erc20",
            "network": "testnet",
            "address": "0x1234567890123456789012345678901234567890",
            "balance": "100.0",
            "symbol": "USDT"
        },
        {
            "chain": "usdt_trc20",
            "network": "testnet",
            "address": "0x9876543210987654321098765432109876543210",
            "balance": "50.0",
            "symbol": "USDT"
        }
    ],
    "totalAddresses": 6
}
```

## 6. Get Mainnet Balances

**Endpoint:** `GET /wallet/balances/mainnet`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get balances for all user mainnet addresses only.

**Response (200):**

```json
{
    "message": "Mainnet balances retrieved successfully",
    "balances": [
        {
            "chain": "ethereum",
            "network": "mainnet",
            "address": "0xabAcBEb1896Acd006e7d51d7CF857487bD118eA6",
            "balance": "0.0",
            "symbol": "ETH"
        },
        {
            "chain": "bitcoin",
            "network": "mainnet",
            "address": "1QA2xxSNyRNzxZRjF8r9PNpzLVNBwENfMV",
            "balance": "0",
            "symbol": "BTC"
        },
        {
            "chain": "solana",
            "network": "mainnet",
            "address": "Df76jHDoc1XzyYHKBfdJ2HyLaYDKj1docAEjvXnrDaZz",
            "balance": "0",
            "symbol": "SOL"
        },
        {
            "chain": "starknet",
            "network": "mainnet",
            "address": "0x3df8ed48bfa8bfebe5faf918eed245fcbda0a3b9df59a2dc4c0436ce1242ed7",
            "balance": "0",
            "symbol": "STRK"
        },
        {
            "chain": "usdt_erc20",
            "network": "mainnet",
            "address": "0xabAcBEb1896Acd006e7d51d7CF857487bD118eA6",
            "balance": "0",
            "symbol": "USDT"
        },
        {
            "chain": "usdt_trc20",
            "network": "mainnet",
            "address": "0x38D3fb1C2753f8F28be923f10EE797CCd15c5f15",
            "balance": "0",
            "symbol": "USDT"
        }
    ],
    "totalAddresses": 6
}
```

---

## 7. Send Transaction

**Endpoint:** `POST /wallet/send`

**Headers:** `Authorization: Bearer <token>`

**Description:** Send funds from your Velo wallet to any valid address (recipient does NOT need to be a Velo user). You can only send from wallets created by Velo (with a private key stored).

**Request Body:**

```json
{
    "chain": "ethereum", // "ethereum", "bitcoin", "solana", "starknet", "usdt_erc20"
    "network": "testnet", // or "mainnet"
    "toAddress": "0xRecipient", // recipient address (any valid address)
    "amount": "0.01"
}
```

_Optional:_  
If you have multiple addresses per chain, you can add:

```json
"fromAddress": "0xYourSenderAddress"
```

**Response (200):**

```json
{
    "message": "Transaction sent",
    "txHash": "..."
}
```

**Notes:**

-   For Starknet, the recipient address must be 66 characters and start with `0x`.
-   For USDT ERC20, amount is in USDT (6 decimals).
-   For Bitcoin, amount is in BTC (not satoshis).

---

## 8. Check for Incoming Deposits

**Endpoint:** `POST /wallet/check-deposits`

**Description:** Manually trigger a deposit check (for testing or cron jobs). Scans all user addresses for new incoming payments and creates notifications.

**Response (200):**

```json
{ "message": "Deposit check complete" }
```

---

# Notification Endpoints

## 1. Get All Notifications

**Endpoint:** `GET /notification`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

-   `page` (optional): Page number (default: 1)
-   `limit` (optional): Items per page (default: 20)
-   `unreadOnly` (optional): Set to "true" for unread only

**Response (200):**

```json
{
    "notifications": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "type": "login",
            "title": "Login Successful",
            "message": "You have successfully logged into your Velo account.",
            "details": {
                "loginTime": "2025-09-20T15:30:00.000Z",
                "ip": "192.168.1.100"
            },
            "isRead": false,
            "createdAt": "2025-09-20T15:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 5,
        "totalPages": 1
    }
}
```

---

## 2. Get Unread Count

**Endpoint:** `GET /notification/count`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
    "unreadCount": 3
}
```

---

## 3. Mark Notification as Read

**Endpoint:** `PATCH /notification/:id/read`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
    "message": "Notification marked as read",
    "notification": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "isRead": true
    }
}
```

---

## 4. Mark All Notifications as Read

**Endpoint:** `PATCH /notification/read-all`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
    "message": "All notifications marked as read"
}
```

---

## 5. Create Send Money Notification

**Endpoint:** `POST /notification/send-money`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
    "amount": "0.5",
    "currency": "ETH",
    "toAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
    "txHash": "0x1234567890abcdef...",
    "details": {
        "fee": "0.001 ETH",
        "network": "mainnet"
    }
}
```

---

## 6. Create Receive Money Notification

**Endpoint:** `POST /notification/receive-money`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
    "amount": "1.0",
    "currency": "BTC",
    "fromAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "txHash": "0xabcdef1234567890...",
    "details": {
        "confirmations": 6
    }
}
```

---

## 7. Create Swap Notification

**Endpoint:** `POST /notification/swap`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
    "fromAmount": "100",
    "fromCurrency": "USDC",
    "toAmount": "0.05",
    "toCurrency": "ETH",
    "details": {
        "rate": "2000 USDC/ETH",
        "slippage": "0.5%"
    }
}
```

---

# Transaction History

## 1. Get Transaction History

**Endpoint:** `GET /history`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

-   `page` (optional): Page number
-   `limit` (optional): Items per page
-   `chain` (optional): Filter by blockchain
-   `type` (optional): Filter by transaction type

**Response (200):**

```json
{
    "transactions": [
        {
            "id": "tx-001",
            "type": "send",
            "chain": "ETH",
            "amount": "0.5",
            "currency": "ETH",
            "fromAddress": "0x...",
            "toAddress": "0x...",
            "txHash": "0x1234567890abcdef...",
            "status": "confirmed",
            "timestamp": "2025-09-20T15:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 10,
        "totalPages": 1
    }
}
```

---

# Quick Start Guide

## 1. Register a User

```bash
curl -X POST "http://localhost:5500/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

## 2. Verify Email (Check email for OTP)

```bash
curl -X POST "http://localhost:5500/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

## 3. Login

```bash
curl -X POST "http://localhost:5500/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

## 4. Use the JWT Token

Copy the `accessToken` from login response and use it in subsequent requests:

```bash
curl -X GET "http://localhost:5500/wallet/addresses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

# Notes

-   You can only send from wallets created by Velo (with a private key stored).
-   You can send to any valid address (recipient does not need to be a Velo user).
-   Deposit notifications are created automatically when new funds are detected.

---

# Supported Chains

-   **Ethereum (ETH)**: Mainnet & Testnet (Sepolia)
-   **Bitcoin (BTC)**: Mainnet & Testnet
-   **Solana (SOL)**: Mainnet & Devnet
-   **Starknet (STRK)**: Mainnet & Testnet
-   **USDT ERC20**: Mainnet & Testnet (Ethereum-based)
-   **USDT TRC20**: Mainnet & Testnet (Tron-based, planned)

---

# Automatic Features

-   **Auto-Generated Wallets:** Upon registration, the system automatically generates wallet addresses for all supported chains on both mainnet and testnet, and stores encrypted private keys.
-   **Auto-Notifications:** The system automatically creates notifications for deposits and other events.
-   **Deposit Checking:** The backend can check for incoming payments and notify users.

---

# Rate Limiting & Security

-   **JWT Access Tokens**: Expire after 30 minutes
-   **Refresh Tokens**: Expire after 7 days
-   **OTP Codes**: Expire after 15 minutes
-   **Password Reset Tokens**: Expire after 15 minutes
-   All sensitive data is encrypted
-   Private keys are encrypted and stored securely
-   Input validation on all endpoints
-   CORS enabled for cross-origin requests
-   Username uniqueness validation
-   Bank details encryption support

---

# Support

For technical support or questions about the Velo API, please contact the development team.

**API Version:** 1.0  
**Last Updated:** September 2025
