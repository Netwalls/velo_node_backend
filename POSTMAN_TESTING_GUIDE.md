# 🧪 VELO Fee System - Postman Testing Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Testing Flow](#testing-flow)
5. [API Endpoints](#api-endpoints)
6. [Test Scenarios](#test-scenarios)
7. [Verifying Database Records](#verifying-database-records)

---

## ✅ Prerequisites

### 1. Start Your Server

```bash
npm run dev
# Server should be running on http://localhost:3000 (or your configured port)
```

### 2. Database Connection

Make sure PostgreSQL is running and your `.env` file has:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/velo_db
NODE_ENV=development
```

### 3. Check Database Tables

After starting the server (with `synchronize: true` in development), the `fees` table should auto-create.

---

## 🗄️ Database Setup

The Fee entity will automatically create this table structure:

```sql
CREATE TABLE fees (
    id UUID PRIMARY KEY,
    "userId" VARCHAR,
    "transactionId" VARCHAR,
    amount DECIMAL(18, 8),
    fee DECIMAL(18, 8),
    total DECIMAL(18, 8),
    tier VARCHAR(50),
    "feePercentage" DECIMAL(8, 4),
    "feeType" VARCHAR(50) DEFAULT 'normal_transaction',
    currency VARCHAR(20) DEFAULT 'USD',
    description VARCHAR(255),
    chain VARCHAR(50),
    network VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);
```

### Verify Table Creation

```sql
-- Check if fees table exists
SELECT * FROM information_schema.tables WHERE table_name = 'fees';

-- View table structure
\d fees
```

---

## ⚙️ Environment Configuration

### Update Your `.env` File

Add treasury wallet addresses (use test addresses for now):

```bash
# Ethereum Treasury (for testing)
VELO_TREASURY_ETH_MAINNET=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
VELO_TREASURY_ETH_SEPOLIA=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1

# Bitcoin Treasury (for testing)
VELO_TREASURY_BTC_MAINNET=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
VELO_TREASURY_BTC_TESTNET=tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx

# Starknet Treasury (for testing)
VELO_TREASURY_STRK_MAINNET=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
VELO_TREASURY_STRK_TESTNET=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7

# Optional: Skip transaction PIN for testing
SKIP_TRANSACTION_PIN=true
```

**Restart your server after updating `.env`**

---

## 🧪 Testing Flow

### **STEP 1: Authentication Setup**

#### 1.1 Register a User (if not already registered)

```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test@1234",
  "phoneNumber": "+1234567890"
}
```

#### 1.2 Login to Get Token

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@1234"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

**💡 Copy the `token` and use it in all subsequent requests as:**

```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### **STEP 2: Test Fee Calculation (Public Endpoints)**

These endpoints don't require authentication - they're for transparency.

#### 2.1 Calculate Single Fee

```http
GET http://localhost:3000/fees/calculate?amount=50
```

**Expected Response:**

```json
{
  "amount": 50,
  "fee": 0.1,
  "total": 50.1,
  "tier": "$0-$50 ($0.10)",
  "feePercentage": 0.2,
  "recipientReceives": 50,
  "senderPays": 50.1,
  "breakdown": {
    "baseFee": "$0.10 flat fee",
    "percentageFee": null
  }
}
```

#### 2.2 Calculate Multiple Fees (Batch)

```http
POST http://localhost:3000/fees/calculate/batch
Content-Type: application/json

{
  "amounts": [50, 75, 150, 600, 1500]
}
```

**Expected Response:**

```json
{
  "calculations": [
    { "amount": 50, "fee": 0.1, "tier": "$0-$50 ($0.10)" },
    { "amount": 75, "fee": 0.25, "tier": "$51-$100 ($0.25)" },
    { "amount": 150, "fee": 1.0, "tier": "$101-$500 ($1.00)" },
    { "amount": 600, "fee": 2.0, "tier": "$501-$1,000 ($2.00)" },
    { "amount": 1500, "fee": 7.5, "tier": "$1,001+ (0.5%)" }
  ],
  "summary": {
    "totalAmount": 2375,
    "totalFees": 10.85,
    "grandTotal": 2385.85
  }
}
```

#### 2.3 Get Fee Configuration

```http
GET http://localhost:3000/fees/config
```

**Expected Response:**

```json
{
  "feeStructure": [
    { "tier": "$0-$50", "fee": "$0.10", "type": "flat" },
    { "tier": "$51-$100", "fee": "$0.25", "type": "flat" },
    { "tier": "$101-$500", "fee": "$1.00", "type": "flat" },
    { "tier": "$501-$1,000", "fee": "$2.00", "type": "flat" },
    { "tier": "$1,001+", "fee": "0.5%", "type": "percentage" }
  ],
  "feeTypes": {
    "normal_transaction": "Tiered fee structure",
    "split_payment": "Same tiered fee per recipient",
    "on_ramp": "FX spread + transaction fee",
    "off_ramp": "FX spread + transaction fee",
    "business_api": "Combined fees + API usage"
  }
}
```

---

### **STEP 3: Test Normal Transaction with Fee**

First, ensure you have a wallet address created. If not, create one:

#### 3.1 Create Wallet (Optional)

```http
POST http://localhost:3000/wallet/create
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "chain": "ethereum",
  "network": "sepolia"
}
```

#### 3.2 Send Transaction with Fee

```http
POST http://localhost:3000/transaction/send
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "amount": "50",
  "chain": "ethereum",
  "network": "sepolia"
}
```

**Expected Response:**

```json
{
  "message": "Transaction sent successfully",
  "transaction": {
    "recipientReceives": 50,
    "fee": 0.1,
    "senderPays": 50.1,
    "tier": "$0-$50 ($0.10)",
    "recipientTxHash": "0xrecipient_...",
    "feeTxHash": "0xfee_...",
    "treasuryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "breakdown": {
      "amount": 50,
      "fee": 0.1,
      "total": 50.1,
      "feeType": "flat",
      "calculation": "Base fee of $0.10"
    }
  }
}
```

**✅ This creates a Fee record in the database!**

---

### **STEP 4: Test Split Payment with Fees**

#### 4.1 Create Split Payment

```http
POST http://localhost:3000/split-payment/create
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Team Payment",
  "chain": "ethereum",
  "network": "sepolia",
  "fromAddress": "YOUR_WALLET_ADDRESS",
  "recipients": [
    {
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      "name": "Alice",
      "email": "alice@example.com",
      "amount": "50"
    },
    {
      "address": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
      "name": "Bob",
      "email": "bob@example.com",
      "amount": "75"
    },
    {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "name": "Charlie",
      "email": "charlie@example.com",
      "amount": "150"
    }
  ]
}
```

**Response:**

```json
{
  "message": "Split payment created successfully",
  "splitPayment": {
    "id": "uuid-here",
    "title": "Team Payment",
    "totalAmount": "275",
    "totalRecipients": 3,
    "status": "active"
  }
}
```

#### 4.2 Execute Split Payment

```http
POST http://localhost:3000/split-payment/execute/{splitPaymentId}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "transactionPin": "1234"
}
```

**Expected Response:**

```json
{
  "message": "Split payment executed successfully",
  "execution": {
    "id": "execution-uuid",
    "status": "completed",
    "total": 3,
    "successful": 3,
    "failed": 0
  },
  "feeBreakdown": {
    "totalPaymentAmount": 275,
    "totalFees": 1.35,
    "senderPaysTotal": 276.35,
    "treasuryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "feeTxHash": "0xfee_...",
    "feeRecords": [
      {
        "recipient": "0x742d...",
        "amount": 50,
        "fee": 0.1,
        "tier": "$0-$50 ($0.10)",
        "feeId": "fee-uuid-1"
      },
      {
        "recipient": "0x853d...",
        "amount": 75,
        "fee": 0.25,
        "tier": "$51-$100 ($0.25)",
        "feeId": "fee-uuid-2"
      },
      {
        "recipient": "0xA0b8...",
        "amount": 150,
        "fee": 1.0,
        "tier": "$101-$500 ($1.00)",
        "feeId": "fee-uuid-3"
      }
    ]
  },
  "results": [
    {
      "recipient": "0x742d...",
      "name": "Alice",
      "amount": 50,
      "success": true,
      "txHash": "0x...",
      "fee": 0.1,
      "tier": "$0-$50 ($0.10)"
    }
    // ... other recipients
  ]
}
```

**✅ This creates 3 Fee records in the database (one per recipient)!**

---

### **STEP 5: Check Fee History**

#### 5.1 Get Your Fee History

```http
GET http://localhost:3000/fees/history
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**

```json
{
  "fees": [
    {
      "id": "uuid",
      "amount": "50.00000000",
      "fee": "0.10000000",
      "total": "50.10000000",
      "tier": "$0-$50 ($0.10)",
      "feeType": "split_payment",
      "chain": "ethereum",
      "network": "sepolia",
      "createdAt": "2025-10-24T10:30:00.000Z",
      "description": "Split payment fee for Team Payment - Recipient: 0x742d..."
    }
    // ... more fee records
  ],
  "summary": {
    "totalFees": 1.35,
    "count": 3
  }
}
```

#### 5.2 Filter Fee History

```http
GET http://localhost:3000/fees/history?feeType=split_payment&chain=ethereum&limit=10
Authorization: Bearer YOUR_TOKEN
```

---

### **STEP 6: Admin Fee Statistics** (Requires Admin Role)

```http
GET http://localhost:3000/fees/stats
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**

```json
{
  "stats": {
    "totalFees": 125.5,
    "totalTransactions": 47,
    "averageFee": 2.67,
    "feesByType": {
      "normal_transaction": 50.25,
      "split_payment": 75.25
    },
    "feesByChain": {
      "ethereum": 100.0,
      "bitcoin": 25.5
    },
    "feesByTier": {
      "$0-$50 ($0.10)": 5.0,
      "$51-$100 ($0.25)": 12.5,
      "$101-$500 ($1.00)": 45.0,
      "$501-$1,000 ($2.00)": 63.0
    }
  }
}
```

---

## 🎯 Test Scenarios

### Scenario 1: Small Transaction ($25)

```json
{ "amount": "25" }
// Expected: fee = $0.10, total = $25.10
```

### Scenario 2: Medium Transaction ($80)

```json
{ "amount": "80" }
// Expected: fee = $0.25, total = $80.25
```

### Scenario 3: Large Transaction ($300)

```json
{ "amount": "300" }
// Expected: fee = $1.00, total = $301.00
```

### Scenario 4: Very Large Transaction ($5000)

```json
{ "amount": "5000" }
// Expected: fee = $25.00 (0.5%), total = $5025.00
```

### Scenario 5: Split Payment with Mixed Amounts

```json
{
  "recipients": [
    { "amount": "30" }, // $0.10 fee
    { "amount": "90" }, // $0.25 fee
    { "amount": "200" }, // $1.00 fee
    { "amount": "800" } // $2.00 fee
  ]
}
// Total payments: $1120
// Total fees: $3.35
// Sender pays: $1123.35
```

---

## 🔍 Verifying Database Records

### Check Fee Records in PostgreSQL

```sql
-- View all fee records
SELECT * FROM fees ORDER BY "createdAt" DESC;

-- View fee records for specific user
SELECT * FROM fees WHERE "userId" = 'your-user-id';

-- View split payment fees
SELECT * FROM fees WHERE "feeType" = 'split_payment';

-- View fee summary by type
SELECT
    "feeType",
    COUNT(*) as count,
    SUM(CAST(fee AS DECIMAL)) as total_fees,
    AVG(CAST(fee AS DECIMAL)) as avg_fee
FROM fees
GROUP BY "feeType";

-- View fee summary by chain
SELECT
    chain,
    COUNT(*) as count,
    SUM(CAST(fee AS DECIMAL)) as total_fees
FROM fees
GROUP BY chain;

-- View fee metadata (for split payments)
SELECT
    id,
    "feeType",
    fee,
    tier,
    metadata->>'splitPaymentId' as split_payment_id,
    metadata->>'recipientAddress' as recipient
FROM fees
WHERE "feeType" = 'split_payment';

-- View recent fees with details
SELECT
    f.id,
    f."userId",
    f.amount,
    f.fee,
    f.tier,
    f."feeType",
    f.chain,
    f.description,
    f."createdAt",
    u.username,
    u.email
FROM fees f
JOIN users u ON f."userId" = u.id
ORDER BY f."createdAt" DESC
LIMIT 20;
```

---

## 📊 Expected Database State After Testing

After completing all tests, you should have:

1. **Fee records** in the `fees` table
2. **Transaction records** in the `transactions` table (if implemented)
3. **Split payment records** in the `split_payments` table
4. **Split payment execution records** in the `split_payment_executions` table
5. **Fee metadata** showing relationships between fees and payments

---

## 🐛 Troubleshooting

### Issue 1: "fees table does not exist"

**Solution:** Restart your server with `NODE_ENV=development` to trigger auto-sync.

### Issue 2: "Treasury wallet not configured"

**Solution:** Check your `.env` file has `VELO_TREASURY_ETH_SEPOLIA` set.

### Issue 3: Fee not appearing in database

**Solution:**

- Check server logs for errors
- Verify Fee entity is in `database.ts` entities array
- Check database connection

### Issue 4: "Invalid transaction PIN"

**Solution:**

- Set `SKIP_TRANSACTION_PIN=true` in `.env` for testing
- OR set transaction PIN via `/user/set-transaction-pin`

---

## ✅ Success Checklist

- [ ] Server running without errors
- [ ] `fees` table created in database
- [ ] Can calculate fees via `/fees/calculate`
- [ ] Can send transaction with fees recorded
- [ ] Can execute split payment with fees recorded
- [ ] Can view fee history via `/fees/history`
- [ ] Fee records visible in PostgreSQL
- [ ] Treasury wallet addresses configured
- [ ] Fee breakdown appears in API responses

---

## 📝 Notes

- All amounts are in USD
- Fees are calculated using tiered structure
- Recipients receive EXACT amounts (no fee deduction)
- Sender pays: amount + fee
- Fees go to configured treasury wallets
- Fee records are created for audit trail
- `feeType` can be: `normal_transaction`, `split_payment`, `on_ramp`, `off_ramp`, `business_api`

---

## 🚀 Next Steps

1. Test with real blockchain transactions (remove placeholders)
2. Implement On/Off Ramp fee model (FX spread)
3. Implement Business API fee model
4. Add fee analytics dashboard
5. Set up production treasury wallets
6. Configure fee collection automation

---

**Happy Testing! 🎉**
