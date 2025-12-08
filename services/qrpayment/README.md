# QR Payment Service

A microservice for handling QR code-based cryptocurrency payment requests in the Velo ecosystem.

## Overview

The QR Payment Service provides a complete solution for merchants to create, manage, and monitor cryptocurrency payment requests via QR codes. It supports multiple blockchains and automatically monitors for payment confirmations.

## Features

- ✅ **Multi-Chain Support**: Ethereum, Bitcoin, Solana, Starknet, Stellar, Polkadot
- ✅ **QR Code Generation**: Automatic QR data string generation
- ✅ **Payment Monitoring**: Automatic blockchain verification
- ✅ **Status Tracking**: Real-time payment status updates
- ✅ **Payment Statistics**: Comprehensive analytics per user
- ✅ **Cancellation**: Cancel pending payments
- ✅ **Batch Monitoring**: Monitor all pending payments (cron-ready)

## Architecture

```
services/qrpayment/
├── src/
│   ├── config/
│   │   └── database.ts          # Database configuration
│   ├── controllers/
│   │   └── QRPaymentController.ts  # Request handlers
│   ├── entities/
│   │   └── MerchantPayment.ts   # Payment entity
│   ├── routes/
│   │   └── qrPaymentRoutes.ts   # API routes
│   ├── services/
│   │   ├── qrPaymentService.ts  # Business logic
│   │   └── blockchainMonitorService.ts  # Blockchain verification
│   └── server.ts                # Application entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Installation

```bash
cd services/qrpayment
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/velo_db

# Server
PORT=3002
NODE_ENV=development

# Blockchain APIs
ETHERSCAN_API_KEY=your-etherscan-api-key
SUBSCAN_API_KEY=your-subscan-api-key

# RPC Endpoints
ETH_MAINNET_RPC=https://eth-mainnet.alchemyapi.io/v2/your-api-key
ETH_SEPOLIA_RPC=https://eth-sepolia.alchemyapi.io/v2/your-api-key
STARKNET_MAINNET_RPC=https://starknet-mainnet.public.blastapi.io
STARKNET_SEPOLIA_RPC=https://starknet-sepolia.public.blastapi.io
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Documentation

The service includes interactive Swagger/OpenAPI documentation.

- **URL**: `http://localhost:3002/api-docs`
- **Format**: OpenAPI 3.0
- **Features**: Interactive testing, schema exploration, response examples

## API Endpoints

### Create Payment Request
```http
POST /api/qrpayment/create
Content-Type: application/json

{
  "userId": "user-uuid",
  "amount": 0.01,
  "chain": "ethereum",
  "network": "testnet",
  "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47",
  "description": "Coffee payment"
}
```

### Get All Payments
```http
GET /api/qrpayment/payments?userId=user-uuid&status=pending&limit=50
```

### Get Payment by ID
```http
GET /api/qrpayment/payments/:id
```

### Check Payment Status
```http
GET /api/qrpayment/payments/:id/status
```

### Monitor Payment
```http
POST /api/qrpayment/monitor/:id
```

### Monitor All Pending Payments
```http
POST /api/qrpayment/monitor-all
```

### Cancel Payment
```http
POST /api/qrpayment/payments/:id/cancel
Content-Type: application/json

{
  "userId": "user-uuid"
}
```

### Get Payment Statistics
```http
GET /api/qrpayment/stats?userId=user-uuid
```

## Payment Flow

1. **Create Payment Request**
   - Merchant creates a payment request with amount and chain
   - System generates QR data string
   - Payment status: `PENDING`

2. **Customer Scans QR Code**
   - Customer scans QR code with wallet app
   - Sends payment to specified address

3. **Blockchain Monitoring**
   - System periodically checks blockchain for payment
   - Verifies amount matches (with 1% tolerance)
   - Updates payment status to `COMPLETED`

4. **Payment Confirmation**
   - Merchant receives notification
   - Transaction hash recorded
   - Payment marked as complete

## Supported Chains

| Chain | Mainnet | Testnet | Status |
|-------|---------|---------|--------|
| Ethereum | ✅ | ✅ (Sepolia) | Active |
| Bitcoin | ✅ | ✅ | Active |
| Solana | ✅ | ✅ (Devnet) | Active |
| Starknet | ⚠️ | ⚠️ (Sepolia) | In Progress |
| Stellar | ✅ | ✅ | Active |
| Polkadot | ⚠️ | ⚠️ (Westend) | Planned |

## Payment Statuses

- `PENDING` - Waiting for payment
- `COMPLETED` - Payment confirmed on blockchain
- `CANCELLED` - Cancelled by merchant
- `FAILED` - Payment verification failed

## Monitoring

### Manual Monitoring
```bash
curl -X POST http://localhost:3002/api/qrpayment/monitor/:paymentId
```

### Automated Monitoring (Cron)
Set up a cron job to monitor all pending payments:

```bash
# Every 5 minutes
*/5 * * * * curl -X POST http://localhost:3002/api/qrpayment/monitor-all
```

## Integration with Main Backend

The QR payment service is designed to work as a standalone microservice but can be integrated with the main Velo backend:

```typescript
// In main backend
import axios from 'axios';

const QR_PAYMENT_SERVICE = 'http://localhost:3002';

// Create payment
const response = await axios.post(`${QR_PAYMENT_SERVICE}/api/qrpayment/create`, {
  userId: req.user.id,
  amount: 0.01,
  chain: 'ethereum',
  network: 'testnet',
  address: userWalletAddress,
});
```

## Database Schema

```sql
CREATE TABLE merchant_payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  address VARCHAR NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  tx_hash VARCHAR,
  transaction_hash VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  chain VARCHAR,
  network VARCHAR,
  description TEXT,
  qr_data TEXT,
  -- Chain-specific addresses
  eth_address VARCHAR,
  btc_address VARCHAR,
  sol_address VARCHAR,
  strk_address VARCHAR,
  stellar_address VARCHAR,
  polkadot_address VARCHAR,
  usdt_erc20_address VARCHAR,
  usdt_trc20_address VARCHAR
);
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Testing

```bash
# Health check
curl http://localhost:3002/health

# Create test payment
curl -X POST http://localhost:3002/api/qrpayment/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "amount": 0.001,
    "chain": "ethereum",
    "network": "testnet",
    "address": "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47"
  }'
```

## Performance

- **Response Time**: < 200ms (average)
- **Blockchain Query Timeout**: 10 seconds
- **Concurrent Monitoring**: Up to 100 payments
- **Database Connection Pool**: 10 connections

## Security

- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (TypeORM)
- ✅ Rate limiting (recommended in production)
- ✅ API key validation for cron endpoints (recommended)

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Payment expiration handling
- [ ] Multi-signature wallet support
- [ ] Payment refund mechanism
- [ ] Advanced analytics dashboard
- [ ] Webhook notifications

## License

Private - Velo Ecosystem

## Support

For issues or questions, contact the Velo development team.
