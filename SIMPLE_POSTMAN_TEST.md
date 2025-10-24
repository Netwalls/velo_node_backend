# 🚀 Simple Postman Test Guide - VELO Fee System

## ✅ Your Exact Request Format Works!

Just send this to Postman - the backend handles everything automatically:

```json
{
  "amount": 5,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x01ef3d43FB71c561593f2d7e2C61d2F0288c7c58e9a58D43381f71A8856d42B8",
  "pin": 1234
}
```

---

## 🎯 Quick Setup (3 Steps)

### 1️⃣ Configure Treasury Wallets in `.env`

```bash
# Add these to your existing .env file
VELO_TREASURY_STRK_TESTNET=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7

# For testing without PIN (optional)
SKIP_TRANSACTION_PIN=true
```

### 2️⃣ Restart Server

```bash
npm run dev
```

### 3️⃣ Get Auth Token

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Copy the `token` from response.

---

## 🧪 Test Transaction

### Endpoint

```http
POST http://localhost:3000/wallet/send
```

### Headers

```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

### Body (Your Format)

```json
{
  "amount": 5,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x01ef3d43FB71c561593f2d7e2C61d2F0288c7c58e9a58D43381f71A8856d42B8",
  "pin": 1234
}
```

---

## ✨ Backend Does Automatically

The backend automatically:

- ✅ **Calculates tier** based on amount ($5 = "$0-$50 ($0.10)" tier)
- ✅ **Calculates fee** ($0.10 for $5)
- ✅ **Calculates total** ($5.10 sender pays)
- ✅ **Validates PIN** (accepts both `pin` and `transactionPin`)
- ✅ **Gets treasury wallet** from your `.env` config
- ✅ **Records fee** in database
- ✅ **Sends notification**

**You just send amount, chain, network, toAddress, pin - that's it!**

---

## 📊 Expected Response

```json
{
  "success": true,
  "message": "Transaction sent successfully",
  "txHash": "0x...",
  "fromAddress": "0xYourAddress...",
  "toAddress": "0x01ef3d43FB71c561593f2d7e2C61d2F0288c7c58e9a58D43381f71A8856d42B8",
  "chain": "starknet",
  "network": "testnet",
  "feeBreakdown": {
    "recipientReceives": 5,
    "fee": 0.1,
    "senderPays": 5.1,
    "tier": "$0-$50 ($0.10)",
    "feePercentage": 0.2,
    "treasuryWallet": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
  }
}
```

### Breakdown Explanation

- **recipientReceives**: $5.00 (exact amount they get)
- **fee**: $0.10 (VELO's fee)
- **senderPays**: $5.10 (what you pay total)
- **tier**: "$0-$50 ($0.10)" (auto-detected)
- **treasuryWallet**: Where the fee goes

---

## 🎨 Test Different Amounts

### Small ($5)

```json
{
  "amount": 5,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x...",
  "pin": 1234
}
```

**Fee:** $0.10 | **You Pay:** $5.10

### Medium ($75)

```json
{
  "amount": 75,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x...",
  "pin": 1234
}
```

**Fee:** $0.25 | **You Pay:** $75.25

### Large ($300)

```json
{
  "amount": 300,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x...",
  "pin": 1234
}
```

**Fee:** $1.00 | **You Pay:** $301.00

### Very Large ($5000)

```json
{
  "amount": 5000,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x...",
  "pin": 1234
}
```

**Fee:** $25.00 (0.5%) | **You Pay:** $5025.00

---

## 🔍 Verify in Database

```sql
-- Check the fee was recorded
SELECT * FROM fees
WHERE "userId" = 'your-user-id'
ORDER BY "createdAt" DESC
LIMIT 5;

-- View fee breakdown
SELECT
    amount,
    fee,
    total,
    tier,
    "feeType",
    chain,
    description,
    "createdAt"
FROM fees
ORDER BY "createdAt" DESC;
```

---

## 🌐 Other Chains

Same format works for all chains:

### Ethereum

```json
{
  "amount": 50,
  "chain": "ethereum",
  "network": "testnet",
  "toAddress": "0xYourEthAddress...",
  "pin": 1234
}
```

**Required in `.env`:** `VELO_TREASURY_ETH_TESTNET=0x...`

### Bitcoin

```json
{
  "amount": 100,
  "chain": "bitcoin",
  "network": "testnet",
  "toAddress": "tb1q...",
  "pin": 1234
}
```

**Required in `.env`:** `VELO_TREASURY_BTC_TESTNET=tb1q...`

### Solana

```json
{
  "amount": 200,
  "chain": "solana",
  "network": "testnet",
  "toAddress": "SolanaAddress...",
  "pin": 1234
}
```

**Required in `.env`:** `VELO_TREASURY_SOL_TESTNET=...`

---

## 🐛 Common Issues

### ❌ "Treasury wallet not configured"

**Fix:** Add treasury wallet to your `.env`:

```bash
VELO_TREASURY_STRK_TESTNET=0xYourTreasuryAddress
```

### ❌ "Invalid transaction PIN"

**Fix:** Either set PIN correctly or bypass for testing:

```bash
SKIP_TRANSACTION_PIN=true
```

### ❌ "No wallet found for this chain/network"

**Fix:** Create a wallet first:

```http
POST http://localhost:3000/wallet/create
{
  "chain": "starknet",
  "network": "testnet"
}
```

---

## ✅ Fee Tiers (Auto-Detected)

| Amount Range  | Fee   | Example              |
| ------------- | ----- | -------------------- |
| $0 - $50      | $0.10 | $5 → Pay $5.10       |
| $51 - $100    | $0.25 | $75 → Pay $75.25     |
| $101 - $500   | $1.00 | $300 → Pay $301.00   |
| $501 - $1,000 | $2.00 | $800 → Pay $802.00   |
| $1,001+       | 0.5%  | $5000 → Pay $5025.00 |

---

## 📝 What Gets Saved

For each transaction, the system saves:

1. **Transaction Record** - In `transactions` table
2. **Fee Record** - In `fees` table with full breakdown
3. **Notification** - User gets notified with fee details

All automatic - you just send the simple request!

---

## 🎉 That's It!

**Your simple format:**

```json
{
  "amount": 5,
  "chain": "starknet",
  "network": "testnet",
  "toAddress": "0x...",
  "pin": 1234
}
```

**Backend automatically handles:**

- Fee calculation ✅
- Tier detection ✅
- Total calculation ✅
- Treasury routing ✅
- Database recording ✅
- Notifications ✅

**Just send and test!** 🚀
