# Velo Multi-Chain Wallet API Documentation

## Table of Contents

-   [Overview](#overview)
-   [Base URL](#base-url)
-   [Authentication](#authentication)
-   [Error Handling](#error-handling)
-   [Authentication Endpoints](#authentication-endpoints)
-   [User Management](#user-management)
-   [Wallet Endpoints](#wallet-endpoints)
-   [QR Payment System](#qr-payment-system)
-   [Conversion & Exchange](#conversion--exchange)
-   [Merchant Payments](#merchant-payments)
-   [Notification Endpoints](#notification-endpoints)
-   [Transaction History](#transaction-history)
-   [KYC & Verification](#kyc--verification)
-   [Response Examples](#response-examples)
-   [Deposit Checking](#deposit-checking)
-   [Send Transactions](#send-transactions)

---

## Overview

The Velo API provides comprehensive multi-chain wallet functionality supporting Ethereum (ETH), Bitcoin (BTC), Solana (SOL), Starknet (STRK), and USDT (ERC20/TRC20). This RESTful API enables user registration, authentication, wallet management, **QR code payments**, **currency conversion**, **merchant payment processing**, notifications, transaction history, **automatic deposit detection**, and **sending funds to any address**.

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
        "username": "john_doe_2024",
        "displayPicture": "https://example.com/profile.jpg",
        "isEmailVerified": true,
        "kycStatus": "pending",
        "bankDetails": {
            "bankName": "Wells Fargo",
            "accountNumber": "9876543210",
            "accountName": "John Doe"
        },
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
        "ethereum": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "chain": "ethereum",
                "network": "mainnet",
                "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
                "addedAt": "2025-09-20T10:30:00.000Z"
            }
        ],
        "bitcoin": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "chain": "bitcoin",
                "network": "mainnet",
                "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "addedAt": "2025-09-20T10:30:00.000Z"
            }
        ]
    },
    "totalCount": 12
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
            "chain": "ethereum",
            "address": "0x8ba1f109551bD432803012645Hac136c5d96c0B9"
        },
        {
            "chain": "bitcoin",
            "address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
        },
        {
            "chain": "solana",
            "address": "11111111111111111111111111111112"
        },
        {
            "chain": "starknet",
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
            "chain": "ethereum",
            "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47"
        },
        {
            "chain": "bitcoin",
            "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        },
        {
            "chain": "solana",
            "address": "11111111111111111111111111111112"
        },
        {
            "chain": "starknet",
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
            "chain": "ethereum",
            "network": "mainnet",
            "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
            "balance": "2.5",
            "currency": "ETH",
            "usdValue": "4250.00"
        },
        {
            "chain": "bitcoin",
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
    "message": "Transaction sent successfully",
    "txHash": "0x1234567890abcdef...",
    "amount": "0.01",
    "fromAddress": "0xYourAddress",
    "toAddress": "0xRecipientAddress",
    "chain": "ethereum",
    "network": "testnet"
}
```

**Notes:**

-   For Starknet, the recipient address must be 66 characters and start with `0x`.
-   For USDT ERC20, amount is in USDT (6 decimals).
-   For Bitcoin, amount is in BTC (not satoshis).
-   Automatic notifications are created for successful transactions.

---

## 8. Check for Incoming Deposits

**Endpoint:** `POST /wallet/check-deposits`

**Description:** Manually trigger a deposit check (for testing or cron jobs). Scans all user addresses for new incoming payments and creates notifications.

**Response (200):**

```json
{ "message": "Deposit check complete" }
```

---

# QR Payment System

## 1. Generate QR Code for Payment

**Endpoint:** `POST /qr/generate`

**Headers:** `Authorization: Bearer <token>`

**Description:** Generate a QR code for receiving payments. Creates a unique payment identifier and QR code data.

**Request Body:**

```json
{
    "chain": "ethereum",
    "network": "testnet",
    "amount": "0.1",
    "description": "Payment for coffee",
    "expiresInMinutes": 30
}
```

**Response (200):**

```json
{
    "message": "QR code generated successfully",
    "qrData": {
        "paymentId": "qr_pay_1234567890abcdef",
        "recipientAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
        "chain": "ethereum",
        "network": "testnet",
        "amount": "0.1",
        "description": "Payment for coffee",
        "createdAt": "2025-10-03T15:30:00.000Z",
        "expiresAt": "2025-10-03T16:00:00.000Z",
        "qrCodeString": "velo://pay?id=qr_pay_1234567890abcdef&chain=ethereum&network=testnet&amount=0.1&to=0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47&desc=Payment%20for%20coffee"
    }
}
```

---

## 2. Scan and Parse QR Code

**Endpoint:** `POST /qr/parse`

**Headers:** `Authorization: Bearer <token>`

**Description:** Parse a scanned QR code and validate payment details.

**Request Body:**

```json
{
    "qrCodeString": "velo://pay?id=qr_pay_1234567890abcdef&chain=ethereum&network=testnet&amount=0.1&to=0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47&desc=Payment%20for%20coffee"
}
```

**Response (200):**

```json
{
    "message": "QR code parsed successfully",
    "paymentDetails": {
        "paymentId": "qr_pay_1234567890abcdef",
        "recipientAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
        "chain": "ethereum",
        "network": "testnet",
        "amount": "0.1",
        "description": "Payment for coffee",
        "isValid": true,
        "isExpired": false,
        "expiresAt": "2025-10-03T16:00:00.000Z"
    }
}
```

---

## 3. Execute QR Payment

**Endpoint:** `POST /qr/pay`

**Headers:** `Authorization: Bearer <token>`

**Description:** Execute payment using parsed QR code data.

**Request Body:**

```json
{
    "paymentId": "qr_pay_1234567890abcdef",
    "fromAddress": "0xYourSenderAddress"
}
```

**Response (200):**

```json
{
    "message": "QR payment completed successfully",
    "transaction": {
        "txHash": "0x1234567890abcdef...",
        "fromAddress": "0xYourSenderAddress",
        "toAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
        "amount": "0.1",
        "chain": "ethereum",
        "network": "testnet",
        "paymentId": "qr_pay_1234567890abcdef",
        "status": "confirmed"
    }
}
```

---

## 4. Get QR Payment Status

**Endpoint:** `GET /qr/status/:paymentId`

**Headers:** `Authorization: Bearer <token>`

**Description:** Check the status of a QR payment.

**Response (200):**

```json
{
    "paymentStatus": {
        "paymentId": "qr_pay_1234567890abcdef",
        "status": "completed",
        "amount": "0.1",
        "chain": "ethereum",
        "network": "testnet",
        "txHash": "0x1234567890abcdef...",
        "paidAt": "2025-10-03T15:45:00.000Z",
        "isExpired": false
    }
}
```

---

# Conversion & Exchange

## 1. Get Supported Currencies

**Endpoint:** `GET /conversion/currencies`

**Description:** Get list of supported currencies for conversion.

**Response (200):**

```json
{
    "currencies": [
        {
            "symbol": "ETH",
            "name": "Ethereum",
            "chain": "ethereum",
            "decimals": 18,
            "type": "native"
        },
        {
            "symbol": "BTC",
            "name": "Bitcoin",
            "chain": "bitcoin",
            "decimals": 8,
            "type": "native"
        },
        {
            "symbol": "SOL",
            "name": "Solana",
            "chain": "solana",
            "decimals": 9,
            "type": "native"
        },
        {
            "symbol": "STRK",
            "name": "Starknet",
            "chain": "starknet",
            "decimals": 18,
            "type": "native"
        },
        {
            "symbol": "USDT",
            "name": "Tether USD",
            "chain": "ethereum",
            "decimals": 6,
            "type": "erc20"
        }
    ]
}
```

---

## 2. Get Exchange Rates

**Endpoint:** `GET /conversion/rates`

**Query Parameters:**

-   `from` (required): Source currency symbol
-   `to` (required): Target currency symbol
-   `amount` (optional): Amount to convert

**Description:** Get real-time exchange rates between cryptocurrencies.

**Response (200):**

```json
{
    "from": "BTC",
    "to": "ETH",
    "rate": "16.25",
    "amount": "1.0",
    "convertedAmount": "16.25",
    "timestamp": "2025-10-03T15:30:00.000Z",
    "source": "coinmarketcap"
}
```

---

## 3. Create Conversion Quote

**Endpoint:** `POST /conversion/quote`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get a conversion quote with estimated fees and execution details.

**Request Body:**

```json
{
    "fromCurrency": "BTC",
    "toCurrency": "ETH",
    "amount": "0.1",
    "network": "testnet"
}
```

**Response (200):**

```json
{
    "quoteId": "quote_1234567890abcdef",
    "fromCurrency": "BTC",
    "toCurrency": "ETH",
    "fromAmount": "0.1",
    "toAmount": "1.625",
    "exchangeRate": "16.25",
    "fees": {
        "networkFee": "0.001",
        "serviceFee": "0.002",
        "totalFees": "0.003"
    },
    "estimatedGas": "21000",
    "slippage": "0.5%",
    "expiresAt": "2025-10-03T15:45:00.000Z",
    "validForMinutes": 15
}
```

---

## 4. Execute Conversion

**Endpoint:** `POST /conversion/execute`

**Headers:** `Authorization: Bearer <token>`

**Description:** Execute a currency conversion using a valid quote.

**Request Body:**

```json
{
    "quoteId": "quote_1234567890abcdef",
    "fromAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "toAddress": "0x8ba1f109551bD432803012645Hac136c5d96c0B9"
}
```

**Response (200):**

```json
{
    "message": "Conversion executed successfully",
    "conversion": {
        "conversionId": "conv_1234567890abcdef",
        "fromCurrency": "BTC",
        "toCurrency": "ETH",
        "fromAmount": "0.1",
        "toAmount": "1.625",
        "fromTxHash": "abc123...",
        "toTxHash": "def456...",
        "status": "completed",
        "executedAt": "2025-10-03T15:35:00.000Z",
        "actualRate": "16.24",
        "fees": {
            "networkFee": "0.001",
            "serviceFee": "0.002"
        }
    }
}
```

---

## 5. Get Conversion History

**Endpoint:** `GET /conversion/history`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

-   `page` (optional): Page number (default: 1)
-   `limit` (optional): Items per page (default: 20)
-   `status` (optional): Filter by status (pending, completed, failed)

**Response (200):**

```json
{
    "conversions": [
        {
            "conversionId": "conv_1234567890abcdef",
            "fromCurrency": "BTC",
            "toCurrency": "ETH",
            "fromAmount": "0.1",
            "toAmount": "1.625",
            "status": "completed",
            "executedAt": "2025-10-03T15:35:00.000Z",
            "fromTxHash": "abc123...",
            "toTxHash": "def456..."
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

# Merchant Payments

## 1. Create Merchant Payment

**Endpoint:** `POST /merchant/payment`

**Headers:** `Authorization: Bearer <token>`

**Description:** Create a payment request for merchant transactions.

**Request Body:**

```json
{
    "merchantId": "merchant_12345",
    "amount": "25.99",
    "currency": "USDT",
    "description": "Coffee and pastry",
    "orderId": "ORDER_2025_001",
    "customerEmail": "customer@example.com",
    "expiresInMinutes": 30,
    "callbackUrl": "https://merchant.com/webhook/payment",
    "network": "testnet"
}
```

**Response (201):**

```json
{
    "message": "Merchant payment created successfully",
    "payment": {
        "paymentId": "pay_1234567890abcdef",
        "merchantId": "merchant_12345",
        "amount": "25.99",
        "currency": "USDT",
        "status": "pending",
        "description": "Coffee and pastry",
        "orderId": "ORDER_2025_001",
        "paymentAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
        "qrCode": "velo://merchant?id=pay_1234567890abcdef&amount=25.99&currency=USDT",
        "expiresAt": "2025-10-03T16:00:00.000Z",
        "createdAt": "2025-10-03T15:30:00.000Z"
    }
}
```

---

## 2. Get Merchant Payment Status

**Endpoint:** `GET /merchant/payment/:paymentId`

**Headers:** `Authorization: Bearer <token>`

**Description:** Check the status of a merchant payment.

**Response (200):**

```json
{
    "payment": {
        "paymentId": "pay_1234567890abcdef",
        "merchantId": "merchant_12345",
        "amount": "25.99",
        "currency": "USDT",
        "status": "completed",
        "description": "Coffee and pastry",
        "orderId": "ORDER_2025_001",
        "txHash": "0x1234567890abcdef...",
        "paidAt": "2025-10-03T15:45:00.000Z",
        "customerInfo": {
            "email": "customer@example.com",
            "paymentAddress": "0x8ba1f109551bD432803012645Hac136c5d96c0B9"
        }
    }
}
```

---

## 3. Pay Merchant Invoice

**Endpoint:** `POST /merchant/pay`

**Headers:** `Authorization: Bearer <token>`

**Description:** Pay a merchant invoice using wallet funds.

**Request Body:**

```json
{
    "paymentId": "pay_1234567890abcdef",
    "fromAddress": "0x8ba1f109551bD432803012645Hac136c5d96c0B9"
}
```

**Response (200):**

```json
{
    "message": "Merchant payment completed successfully",
    "transaction": {
        "txHash": "0x1234567890abcdef...",
        "paymentId": "pay_1234567890abcdef",
        "amount": "25.99",
        "currency": "USDT",
        "merchantId": "merchant_12345",
        "status": "confirmed",
        "paidAt": "2025-10-03T15:45:00.000Z"
    }
}
```

---

## 4. Get Merchant Payment History

**Endpoint:** `GET /merchant/payments`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

-   `merchantId` (optional): Filter by merchant
-   `status` (optional): Filter by status
-   `page` (optional): Page number
-   `limit` (optional): Items per page

**Response (200):**

```json
{
    "payments": [
        {
            "paymentId": "pay_1234567890abcdef",
            "merchantId": "merchant_12345",
            "amount": "25.99",
            "currency": "USDT",
            "status": "completed",
            "description": "Coffee and pastry",
            "orderId": "ORDER_2025_001",
            "paidAt": "2025-10-03T15:45:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 3,
        "totalPages": 1
    }
}
```

---

# KYC & Verification

## 1. Upload KYC Document

**Endpoint:** `POST /kyc/upload`

**Headers:**

-   `Authorization: Bearer <token>`
-   `Content-Type: multipart/form-data`

**Description:** Upload KYC verification documents.

**Form Data:**

-   `documentType`: "passport" | "national_id" | "driver_license" | "utility_bill"
-   `file`: Document image file (JPG, PNG, PDF)

**Response (200):**

```json
{
    "message": "Document uploaded successfully",
    "document": {
        "id": "doc_1234567890abcdef",
        "documentType": "passport",
        "fileName": "passport_john_doe.jpg",
        "fileSize": 2048576,
        "status": "pending",
        "uploadedAt": "2025-10-03T15:30:00.000Z"
    }
}
```

---

## 2. Get KYC Status

**Endpoint:** `GET /kyc/status`

**Headers:** `Authorization: Bearer <token>`

**Description:** Get current KYC verification status.

**Response (200):**

```json
{
    "kycStatus": {
        "status": "pending",
        "documentsSubmitted": 2,
        "documentsRequired": 3,
        "documents": [
            {
                "id": "doc_1234567890abcdef",
                "documentType": "passport",
                "status": "approved",
                "uploadedAt": "2025-10-03T15:30:00.000Z"
            },
            {
                "id": "doc_2234567890abcdef",
                "documentType": "utility_bill",
                "status": "pending",
                "uploadedAt": "2025-10-03T16:00:00.000Z"
            }
        ],
        "nextSteps": [
            "Upload proof of address document",
            "Wait for document review"
        ]
    }
}
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
-   `type` (optional): Filter by notification type

**Response (200):**

```json
{
    "notifications": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "type": "deposit",
            "title": "Deposit Received",
            "message": "You received 0.1 BTC at your wallet address",
            "details": {
                "amount": "0.1",
                "currency": "BTC",
                "txHash": "abc123...",
                "address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
            },
            "isRead": false,
            "createdAt": "2025-10-03T15:30:00.000Z"
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "type": "send",
            "title": "Payment Sent",
            "message": "You sent 0.05 ETH to 0x742d35...",
            "details": {
                "amount": "0.05",
                "currency": "ETH",
                "toAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
                "txHash": "def456..."
            },
            "isRead": true,
            "createdAt": "2025-10-03T14:15:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 12,
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
    "message": "All notifications marked as read",
    "updatedCount": 3
}
```

---

## 5. Delete Notification

**Endpoint:** `DELETE /notification/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
    "message": "Notification deleted successfully"
}
```

---

# Transaction History

## 1. Get Transaction History

**Endpoint:** `GET /history`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

-   `page` (optional): Page number (default: 1)
-   `limit` (optional): Items per page (default: 20)
-   `chain` (optional): Filter by blockchain
-   `network` (optional): Filter by network
-   `type` (optional): Filter by transaction type
-   `dateFrom` (optional): Start date (ISO string)
-   `dateTo` (optional): End date (ISO string)

**Response (200):**

```json
{
    "transactions": [
        {
            "id": "tx-001",
            "type": "send",
            "chain": "ethereum",
            "network": "testnet",
            "amount": "0.5",
            "currency": "ETH",
            "fromAddress": "0x8ba1f109551bD432803012645Hac136c5d96c0B9",
            "toAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
            "txHash": "0x1234567890abcdef...",
            "status": "confirmed",
            "timestamp": "2025-10-03T15:30:00.000Z",
            "fees": {
                "networkFee": "0.001",
                "serviceFee": "0.0005"
            }
        },
        {
            "id": "tx-002",
            "type": "receive",
            "chain": "bitcoin",
            "network": "testnet",
            "amount": "0.001",
            "currency": "BTC",
            "fromAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
            "toAddress": "mymoYSk7wH2cSCJRNDfmMj8t3CTE1X87aK",
            "txHash": "cb5428e7b8f12dfcbe195e27c589e0f7de1c74183d021fbf6623f56c95d3a0e1",
            "status": "confirmed",
            "timestamp": "2025-10-03T14:15:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 25,
        "totalPages": 2
    },
    "summary": {
        "totalSent": "1.25",
        "totalReceived": "2.1",
        "totalTransactions": 25
    }
}
```

---

## 2. Get Transaction Details

**Endpoint:** `GET /history/:transactionId`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
    "transaction": {
        "id": "tx-001",
        "type": "send",
        "chain": "ethereum",
        "network": "testnet",
        "amount": "0.5",
        "currency": "ETH",
        "fromAddress": "0x8ba1f109551bD432803012645Hac136c5d96c0B9",
        "toAddress": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
        "txHash": "0x1234567890abcdef...",
        "status": "confirmed",
        "timestamp": "2025-10-03T15:30:00.000Z",
        "blockNumber": 12345678,
        "confirmations": 15,
        "fees": {
            "networkFee": "0.001",
            "serviceFee": "0.0005",
            "gasUsed": "21000",
            "gasPrice": "20"
        },
        "metadata": {
            "description": "Payment for services",
            "tags": ["business", "payment"]
        }
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

## 5. Generate QR Code for Payment

```bash
curl -X POST "http://localhost:5500/qr/generate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "network": "testnet",
    "amount": "0.1",
    "description": "Coffee payment"
  }'
```

## 6. Get Exchange Rates

```bash
curl -X GET "http://localhost:5500/conversion/rates?from=BTC&to=ETH&amount=1.0"
```

## 7. Send Transaction

```bash
curl -X POST "http://localhost:5500/wallet/send" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "bitcoin",
    "network": "testnet",
    "toAddress": "mnWBTqGfj295Qq8uuzCf7ZMmfETagJ6wSZ",
    "amount": "0.00001"
  }'
```

---

# Supported Chains & Networks

| Chain          | Mainnet | Testnet      | Native Currency | Notes                     |
| -------------- | ------- | ------------ | --------------- | ------------------------- |
| **Ethereum**   | ✅      | ✅ (Sepolia) | ETH             | Full transaction support  |
| **Bitcoin**    | ✅      | ✅           | BTC             | P2PKH and SegWit support  |
| **Solana**     | ✅      | ✅ (Devnet)  | SOL             | High-speed transactions   |
| **Starknet**   | ✅      | ✅ (Sepolia) | STRK            | Layer 2 scaling solution  |
| **USDT ERC20** | ✅      | ✅           | USDT            | Ethereum-based stablecoin |
| **USDT TRC20** | 🚧      | 🚧           | USDT            | Tron-based (planned)      |

---

# New Features

## 🎯 QR Code Payments

-   **Generate QR codes** for receiving payments
-   **Scan QR codes** to parse payment details
-   **Execute payments** using QR data
-   **Track payment status** in real-time
-   **Expiration handling** for security

## 💱 Currency Conversion

-   **Real-time exchange rates** from multiple sources
-   **Conversion quotes** with fees and slippage
-   **Execute conversions** between supported currencies
-   **Conversion history** tracking
-   **Multiple currency support**

## 🏪 Merchant Payments

-   **Create payment requests** for businesses
-   **QR code generation** for merchant payments
-   **Order tracking** with custom order IDs
-   **Webhook notifications** for payment updates
-   **Customer information** collection

## 📋 Enhanced KYC

-   **Document upload** support (passport, ID, utility bills)
-   **KYC status tracking** with progress indicators
-   **Multi-step verification** process
-   **Document status management**

## 🔔 Improved Notifications

-   **Enhanced notification types** (deposit, send, conversion, merchant)
-   **Rich notification details** with transaction info
-   **Bulk operations** (mark all as read)
-   **Notification filtering** by type and status
-   **Delete notifications** capability

## 📊 Advanced Transaction History

-   **Enhanced filtering** by date, chain, network, type
-   **Transaction summaries** with totals
-   **Detailed transaction view** with metadata
-   **Fee breakdown** information
-   **Confirmation tracking**

---

# Automatic Features

-   **Auto-Generated Wallets:** Upon registration, the system automatically generates wallet addresses for all supported chains on both mainnet and testnet, and stores encrypted private keys.
-   **Auto-Notifications:** The system automatically creates notifications for deposits, sends, conversions, and merchant payments.
-   **Deposit Monitoring:** The backend continuously monitors for incoming payments and creates notifications.
-   **QR Code Management:** Automatic QR code generation and validation for payments.
-   **Exchange Rate Updates:** Real-time rate fetching from multiple sources.

---

# Rate Limiting & Security

-   **JWT Access Tokens**: Expire after 30 minutes
-   **Refresh Tokens**: Expire after 7 days
-   **OTP Codes**: Expire after 15 minutes
-   **Password Reset Tokens**: Expire after 15 minutes
-   **QR Payment Codes**: Configurable expiration (default 30 minutes)
-   **Conversion Quotes**: Expire after 15 minutes
-   All sensitive data is encrypted
-   Private keys are encrypted and stored securely
-   Input validation on all endpoints
-   CORS enabled for cross-origin requests
-   Username uniqueness validation
-   Bank details encryption support
-   File upload validation for KYC documents

---

# API Response Codes

| Code  | Description           | Usage                                             |
| ----- | --------------------- | ------------------------------------------------- |
| `200` | OK                    | Successful GET, PUT, PATCH requests               |
| `201` | Created               | Successful POST requests (registration, creation) |
| `400` | Bad Request           | Invalid input, validation errors                  |
| `401` | Unauthorized          | Missing or invalid authentication                 |
| `403` | Forbidden             | Access denied, insufficient permissions           |
| `404` | Not Found             | Resource not found                                |
| `409` | Conflict              | Duplicate resource (email, username)              |
| `422` | Unprocessable Entity  | Valid input but business logic failure            |
| `429` | Too Many Requests     | Rate limiting exceeded                            |
| `500` | Internal Server Error | Server-side errors                                |

---

# Webhook Events (For Merchants)

## Payment Events

-   `payment.created` - New payment request created
-   `payment.completed` - Payment successfully processed
-   `payment.failed` - Payment failed or expired
-   `payment.expired` - Payment request expired

## Conversion Events

-   `conversion.completed` - Currency conversion completed
-   `conversion.failed` - Conversion failed

**Webhook Payload Example:**

```json
{
    "event": "payment.completed",
    "timestamp": "2025-10-03T15:45:00.000Z",
    "data": {
        "paymentId": "pay_1234567890abcdef",
        "merchantId": "merchant_12345",
        "amount": "25.99",
        "currency": "USDT",
        "txHash": "0x1234567890abcdef...",
        "orderId": "ORDER_2025_001"
    }
}
```

---

# Support

For technical support or questions about the Velo API, please contact the development team.

**API Version:** 2.0  
**Last Updated:** October 2025  
**Documentation Version:** 2.1.0

---

# Changelog

## Version 2.0.0 (October 2025)

-   ✅ Added QR code payment system
-   ✅ Added currency conversion features
-   ✅ Added merchant payment processing
-   ✅ Enhanced KYC document management
-   ✅ Improved notification system
-   ✅ Advanced transaction history with filtering
-   ✅ Real-time exchange rate integration
-   ✅ Webhook support for merchants
-   ✅ Bitcoin transaction improvements (P2PKH and SegWit)
-   ✅ Enhanced security and validation

## Version 1.0.0 (September 2025)

-   ✅ Initial release with basic wallet functionality
-   ✅ Multi-chain support (ETH, BTC, SOL, STRK, USDT)
-   ✅ User authentication and management
-   ✅ Basic transaction sending and receiving
-   ✅ Deposit monitoring
-   ✅ Basic notification system
