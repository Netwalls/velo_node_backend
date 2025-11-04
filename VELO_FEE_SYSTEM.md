# VELO Fee System - Implementation Guide

## Overview

The VELO fee system implements a **sender-pays-fee** model where:

- Recipient receives the exact amount requested
- Sender pays amount + fee
- Fees are automatically sent to VELO treasury wallets

## Fee Structure

| Amount Range  | Fee   | Percentage | Description                      |
| ------------- | ----- | ---------- | -------------------------------- |
| $0 - $10      | $0.00 | 0%         | Micro transactions (no VELO fee) |
| $10.01 - $50  | $0.10 | ~0.2%-0.5% | Micro transactions               |
| $51 - $100    | $0.25 | ~0.25%     | Entry-level                      |
| $101 - $500   | $1.00 | ~0.2%      | Retail                           |
| $501 - $1,000 | $2.00 | ~0.2%      | SME/Merchant                     |
| $1,001+       | 0.5%  | 0.5%       | Enterprise                       |

## Example Transaction Flow

### Scenario: User sends $50 to recipient

```typescript
// 1. Calculate fee
const calculation = FeeService.calculateFee(50);
// Result:
{
  amount: 50,
  fee: 0.10,
  total: 50.10,
  recipientReceives: 50,    // Recipient gets exactly $50
  senderPays: 50.10         // Sender pays $50.10
}

// 2. Validate sender balance
const validation = FeeCollectionService.validateSufficientBalance(
  senderBalance: 100,
  amount: 50,
  fee: 0.10
);
// Result: { valid: true, required: 50.10 }

// 3. Execute transaction
// - Deduct $50.10 from sender
// - Send $50.00 to recipient
// - Send $0.10 to VELO treasury

// 4. Record fee in database
await FeeCollectionService.recordFee({
  userId: '...',
  calculation,
  chain: 'ethereum',
  network: 'mainnet'
});
```

## Setup Instructions

### 1. Configure Treasury Wallets

Add treasury wallet addresses to your `.env` file:

```bash
# Ethereum
VELO_TREASURY_ETH_MAINNET=0xYourMainnetAddress
VELO_TREASURY_ETH_SEPOLIA=0xYourSepoliaAddress

# Starknet
VELO_TREASURY_STRK_MAINNET=0xYourMainnetAddress
VELO_TREASURY_STRK_TESTNET=0xYourTestnetAddress

# Add for all chains you support...
```

### 2. Test Fee Calculation

```bash
# Calculate fee for $100
curl http://localhost:5500/fees/calculate?amount=100

# Response:
{
  "success": true,
  "calculation": {
    "amount": 100,
    "fee": 0.25,
    "total": 100.25,
    "tier": "$51-$100",
    "feePercentage": 0.25,
    "recipientReceives": 100,
    "senderPays": 100.25
  }
}
```

### 3. Get Fee Configuration

```bash
curl http://localhost:5500/fees/config
```

## API Endpoints

### Public Endpoints

#### Calculate Fee

```http
GET /fees/calculate?amount=100
```

#### Batch Calculate

```http
POST /fees/calculate/batch
Content-Type: application/json

{
  "amounts": [25, 75, 250, 800, 5000]
}
```

#### Get Fee Config

```http
GET /fees/config
```

### Protected Endpoints (Require Auth)

#### Fee History

```http
GET /fees/history?limit=50&offset=0
Authorization: Bearer <token>
```

### Admin Endpoints

#### Fee Statistics

```http
GET /fees/stats
Authorization: Bearer <admin-token>
```

## Integration in Transaction Controllers

### Example: Update Send Money Function

```typescript
import { FeeService } from "../services/feeService";
import FeeCollectionService from "../services/feeCollectionService";

async function sendMoney(params: {
  userId: string;
  amount: number;
  recipientAddress: string;
  chain: string;
  network: string;
}) {
  // 1. Calculate fee
  const calculation = FeeService.calculateFee(params.amount);

  // 2. Get treasury address
  const treasuryAddress = FeeCollectionService.getTreasuryWallet(
    params.chain,
    params.network
  );

  // 3. Validate balance
  const userBalance = await getUserBalance(params.userId, params.chain);
  const validation = FeeCollectionService.validateSufficientBalance(
    userBalance,
    params.amount,
    calculation.fee
  );

  if (!validation.valid) {
    throw new Error(
      `Insufficient balance. Need $${validation.required}, ` +
        `short $${validation.shortfall}`
    );
  }

  // 4. Execute transactions
  // Send exact amount to recipient
  const recipientTx = await sendToRecipient({
    amount: params.amount,
    to: params.recipientAddress,
  });

  // Send fee to treasury
  const feeTx = await sendToTreasury({
    amount: calculation.fee,
    to: treasuryAddress,
  });

  // 5. Record fee
  await FeeCollectionService.recordFee({
    userId: params.userId,
    transactionId: recipientTx.id,
    calculation,
    chain: params.chain,
    network: params.network,
  });

  return {
    success: true,
    recipientTx,
    feeTx,
    calculation,
  };
}
```

## Database Schema

### Fee Table

```sql
CREATE TABLE fees (
  id UUID PRIMARY KEY,
  user_id VARCHAR,
  transaction_id UUID,
  amount DECIMAL(18,8),
  fee DECIMAL(18,8),
  total DECIMAL(18,8),
  tier VARCHAR(50),
  fee_percentage DECIMAL(8,4),
  fee_type VARCHAR(50), -- 'normal_transaction', 'on_ramp', 'off_ramp'
  currency VARCHAR(20),
  chain VARCHAR(50),
  network VARCHAR(50),
  created_at TIMESTAMP,
  metadata JSONB
);
```

## Fee Collection Flow

```
┌─────────────┐
│   Sender    │ Balance: $100
└──────┬──────┘
       │
       │ Wants to send $50
       │
       ▼
┌─────────────────────┐
│  FeeService         │
│  Calculate:         │
│  - Amount: $50      │
│  - Fee: $0.10       │
│  - Total: $50.10    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Validate Balance    │
│ $100 >= $50.10 ✓    │
└──────┬──────────────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐   ┌────────────┐
│ Recipient   │    │  Treasury   │   │  Database  │
│ Gets: $50   │    │ Gets: $0.10 │   │Record Fee  │
└─────────────┘    └─────────────┘   └────────────┘
```

## Benefits

✅ **Transparent**: Recipients always know exact amount they'll receive  
✅ **Fair**: Sender bears the cost of transaction  
✅ **Scalable**: Percentage-based for large transactions  
✅ **Trackable**: All fees recorded in database  
✅ **Auditable**: Complete transaction history  
✅ **Flexible**: Easy to adjust tiers via FeeService

## Next Steps

1. ✅ Fee calculation service
2. ✅ Treasury wallet configuration
3. ✅ Fee recording in database
4. 🔄 Integration into transaction controllers
5. 📋 On/Off Ramp fee model (FX spread)
6. 📋 Business API fee model
7. 📋 Admin dashboard for fee analytics

## Support

For questions or issues, refer to the VELO business model documentation.
