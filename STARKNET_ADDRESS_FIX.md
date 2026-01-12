# Starknet Address Padding Fix

## Problem

Starknet addresses were being generated and stored without proper padding, resulting in addresses that are shorter than the required 66 characters (0x + 64 hex digits). For example:

- **Wrong**: `0x2f681a7578f25ee65797f196ef7a550fb47f036ca8e43d7bc9e47c33451a011` (65 chars)
- **Correct**: `0x02f681a7578f25ee65797f196ef7a550fb47f036ca8e43d7bc9e47c33451a011` (66 chars)

This caused the balance checking to fail because Starknet's smart contract calls require properly padded addresses.

## Solution

### 1. **Code Fixes** ✅

The following files have been updated to ensure addresses are properly padded:

#### `src/utils/keygen.ts` - `generateStrkWallet()`

```typescript
// Ensure address is properly padded to 66 characters (0x + 64 hex chars)
address = address.startsWith("0x")
  ? "0x" + address.slice(2).padStart(64, "0")
  : address;
```

#### `services/splitpayment/src/utils/keygen.ts` - `generateStrkWallet()`

Same padding logic applied.

#### `src/utils/keygen.ts` - `checkBalance()`

```typescript
// Pad the address to 66 characters (0x + 64 hex chars) for proper Starknet format
const paddedAddress = address.startsWith("0x")
  ? "0x" + address.slice(2).padStart(64, "0")
  : address;
```

All new Starknet addresses will now be automatically padded correctly.

### 2. **Database Migration**

Run the PostgreSQL migration to fix existing unpadded addresses:

#### **Option 1: Using the TypeScript Migration Script (Recommended)**

```bash
# Automatically reads DATABASE_URL from .env
npx ts-node scripts/fix-starknet-addresses.ts
```

#### **Option 2: Using psql directly**

```bash
# Parse DATABASE_URL and connect directly
psql $DATABASE_URL -f scripts/fix-starknet-addresses.sql

# Or manually:
psql -h <host> -U <username> -d <database_name> -f scripts/fix-starknet-addresses.sql
```

#### **Option 3: Manual SQL query**

Run this query directly in your PostgreSQL client:

```sql
UPDATE user_addresses
SET address =
    CASE
        WHEN LENGTH(address) = 66 THEN address
        WHEN LENGTH(address) < 66 AND address LIKE '0x%' THEN
            '0x' || LPAD(SUBSTRING(address FROM 3), 64, '0')
        ELSE address
    END
WHERE chain = 'starknet'
  AND LENGTH(address) < 66
  AND address LIKE '0x%';
```

## Verification

After applying the fix, verify that all Starknet addresses are properly padded:

```sql
SELECT
    id,
    user_id,
    chain,
    network,
    address,
    LENGTH(address) as address_length
FROM user_addresses
WHERE chain = 'starknet'
  AND LENGTH(address) != 66;
```

This should return no results if all addresses are fixed.

## Impact

- ✅ Starknet balance checking now works correctly
- ✅ Account deployment can proceed when user has sufficient funds
- ✅ All contract calls with properly padded addresses
- ✅ Future addresses generated will be automatically correct

## Testing

After the fix, users should be able to:

1. Check their Starknet balance correctly
2. Deploy their Starknet account when they have 0.5+ STRK
3. Send transactions from their Starknet wallet
4. Make airtime purchases using Starknet
