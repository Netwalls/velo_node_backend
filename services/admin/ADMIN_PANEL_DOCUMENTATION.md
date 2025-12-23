# Velo Admin Panel - Comprehensive API Documentation

## Overview

The Velo Admin Panel provides a complete fintech administration interface with 10 core modules for managing users, transactions, KYC/AML compliance, fraud detection, customer support, analytics, and system configuration.

## Architecture

- **Pattern**: TypeORM with entity-service-controller architecture (following auth service pattern)
- **Configuration**: Uses shared `env` object from `shared/config/env` (NO direct process.env access)
- **Database**: PostgreSQL via TypeORM DataSource
- **Entities**: Admin-specific entities + access to monolith entities (User, Transaction, KYC, etc.)

## Authentication

All endpoints require the `x-admin-key` header:

```
x-admin-key: <INTERNAL_API_KEY>
```

Base URL: `/admin/v2`

---

## 1. USER MANAGEMENT MODULE

### List Users

```http
GET /admin/v2/users?search=john&status=active&kycStatus=approved&page=1&limit=50
```

**Query Params:**

- `search`: Email, phone, or name
- `status`: active, suspended, banned
- `kycStatus`: approved, pending, rejected
- `page`, `limit`: Pagination

**Response:**

```json
{
  "users": [...],
  "total": 1500,
  "page": 1,
  "limit": 50,
  "totalPages": 30
}
```

### Get User Details

```http
GET /admin/v2/users/:userId
```

**Response:**

```json
{
  "user": {...},
  "kycDocs": [...],
  "transactionStats": { "count": 45, "totalVolume": 125000 },
  "recentTransactions": [...],
  "fraudAlerts": [...],
  "auditLogs": [...]
}
```

### Suspend User

```http
POST /admin/v2/users/:userId/suspend
Content-Type: application/json

{
  "reason": "Suspicious activity detected"
}
```

### Ban User

```http
POST /admin/v2/users/:userId/ban
Content-Type: application/json

{
  "reason": "Repeated violations"
}
```

### Unlock/Reactivate User

```http
POST /admin/v2/users/:userId/unlock
```

### User Segmentation Stats

```http
GET /admin/v2/users-segmentation
```

**Response:**

```json
{
  "byStatus": [
    { "status": "active", "count": 1200 },
    { "status": "suspended", "count": 50 }
  ],
  "byKycStatus": [...]
}
```

---

## 2. TRANSACTION MONITORING MODULE

### List Transactions

```http
GET /admin/v2/transactions?userId=xxx&type=send&status=completed&chain=ethereum&minAmount=100&maxAmount=10000&startDate=2024-01-01&endDate=2024-12-31&search=0x123&page=1&limit=50
```

**Query Params:**

- `userId`: Filter by user
- `type`: send, receive, swap, etc.
- `status`: completed, pending, failed
- `chain`: ethereum, bitcoin, starknet, etc.
- `minAmount`, `maxAmount`: Amount range
- `startDate`, `endDate`: Date range
- `search`: Transaction ID or hash

### Get Transaction Details

```http
GET /admin/v2/transactions/:transactionId
```

### Flag Transaction

```http
POST /admin/v2/transactions/:transactionId/flag
Content-Type: application/json

{
  "reason": "Unusual amount pattern"
}
```

### Transaction Stats

```http
GET /admin/v2/transactions-stats?startDate=2024-01-01&endDate=2024-12-31
```

### Export Transactions (CSV)

```http
GET /admin/v2/transactions-export?userId=xxx&type=send&status=completed&startDate=2024-01-01&endDate=2024-12-31
```

---

## 3. KYC/AML COMPLIANCE MODULE

### List KYC Documents

```http
GET /admin/v2/kyc?status=pending&verificationType=identity&page=1&limit=50
```

**Response:** Oldest pending first (review queue)

### Get KYC Details

```http
GET /admin/v2/kyc/:kycId
```

**Response:**

```json
{
  "kycDoc": {...},
  "user": {...},
  "userTransactions": [...],
  "otherKYCDocs": [...],
  "riskScore": 35
}
```

**Risk Score Calculation:**

- New user (< 7 days): +20
- High transaction velocity (> 5 txns): +15
- Large volume (> $10k): +25
- Multiple failed transactions (> 2): +20
- Email not verified: +10

### Approve KYC

```http
POST /admin/v2/kyc/:kycId/approve
Content-Type: application/json

{
  "notes": "All documents verified"
}
```

### Reject KYC

```http
POST /admin/v2/kyc/:kycId/reject
Content-Type: application/json

{
  "reason": "Document quality insufficient"
}
```

### KYC Stats

```http
GET /admin/v2/kyc-stats
```

**Response:**

```json
{
  "byStatus": [...],
  "byType": [...],
  "avgReviewTimeSeconds": 3600
}
```

---

## 4. FRAUD & RISK MANAGEMENT MODULE

### List Fraud Alerts

```http
GET /admin/v2/fraud-alerts?status=pending&page=1&limit=50
```

**Alert Types:**

- `high_velocity`: Too many transactions in short time
- `suspicious_amount`: Unusual transaction amounts
- `multiple_cards`: Multiple payment methods
- `chargeback_risk`: High chargeback probability
- `unusual_pattern`: Anomaly detected
- `blocklisted_match`: Matches blocklist entry

### Review Fraud Alert

```http
POST /admin/v2/fraud-alerts/:alertId/review
Content-Type: application/json

{
  "status": "confirmed_fraud",
  "notes": "Confirmed via manual review"
}
```

**Status Options:**

- `reviewed`: Reviewed, no action needed
- `confirmed_fraud`: Confirmed fraud (auto-suspends user)
- `false_positive`: False alarm

### Fraud Stats

```http
GET /admin/v2/fraud-stats
```

### List Blocklist

```http
GET /admin/v2/blocklist?page=1&limit=50
```

### Add to Blocklist

```http
POST /admin/v2/blocklist
Content-Type: application/json

{
  "type": "email",
  "value": "fraud@example.com",
  "reason": "Known fraudster",
  "expiresAt": "2025-12-31T00:00:00Z"
}
```

**Blocklist Types:**

- `email`
- `phone`
- `ip`
- `card`
- `country`
- `wallet_address`

### Remove from Blocklist

```http
DELETE /admin/v2/blocklist/:blocklistId
```

---

## 5. CUSTOMER SUPPORT MODULE

### List Support Tickets

```http
GET /admin/v2/support/tickets?status=open&assignedTo=admin123&page=1&limit=50
```

**Ticket Statuses:**

- `open`: New ticket
- `in_progress`: Admin working on it
- `waiting_user`: Waiting for user response
- `resolved`: Issue resolved
- `closed`: Ticket closed

**Priority Levels:** low, medium, high, urgent

### Get Ticket Details

```http
GET /admin/v2/support/tickets/:ticketId
```

### Assign Ticket

```http
POST /admin/v2/support/tickets/:ticketId/assign
```

Auto-assigns to authenticated admin.

### Update Ticket Status

```http
PATCH /admin/v2/support/tickets/:ticketId/status
Content-Type: application/json

{
  "status": "resolved"
}
```

### Add Internal Note

```http
POST /admin/v2/support/tickets/:ticketId/notes
Content-Type: application/json

{
  "note": "User contacted via email, waiting for response"
}
```

### Support Stats

```http
GET /admin/v2/support-stats
```

**Response:**

```json
{
  "byStatus": [...],
  "byPriority": [...],
  "avgResolutionTimeSeconds": 7200
}
```

---

## 6. ANALYTICS MODULE

### Daily Active Users (DAU)

```http
GET /admin/v2/analytics/dau?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**

```json
[
  { "date": "2024-01-01", "activeUsers": 1250 },
  { "date": "2024-01-02", "activeUsers": 1320 }
]
```

### Transaction Volume Chart

```http
GET /admin/v2/analytics/transaction-volume?startDate=2024-01-01&endDate=2024-12-31&granularity=day
```

**Granularity:** `day`, `week`, `month`

**Response:**

```json
[
  { "period": "2024-01-01", "count": 450, "totalAmount": 125000 },
  { "period": "2024-01-02", "count": 520, "totalAmount": 145000 }
]
```

### Provider Performance

```http
GET /admin/v2/analytics/provider-performance?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**

```json
{
  "airtime": [
    { "provider": "provider_a", "count": 1200, "totalAmount": 50000, "successRate": 98.5 }
  ],
  "data": [...]
}
```

### Revenue Metrics

```http
GET /admin/v2/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**

```json
{
  "totalFees": 15000,
  "volumeByType": [
    { "type": "send", "count": 2000, "totalAmount": 500000 },
    { "type": "swap", "count": 800, "totalAmount": 200000 }
  ]
}
```

---

## 7. SYSTEM CONFIGURATION MODULE

### List All Configs

```http
GET /admin/v2/config
```

### Update Config

```http
POST /admin/v2/config
Content-Type: application/json

{
  "key": "max_transaction_amount",
  "value": "100000",
  "description": "Maximum transaction amount in USD"
}
```

### Toggle Maintenance Mode

```http
POST /admin/v2/config/maintenance-mode
Content-Type: application/json

{
  "enabled": true
}
```

### Toggle Provider

```http
POST /admin/v2/config/provider-toggle
Content-Type: application/json

{
  "provider": "paystack",
  "enabled": false
}
```

### Update Platform Fee

```http
POST /admin/v2/config/platform-fee
Content-Type: application/json

{
  "feeType": "transaction",
  "percentage": 1.5
}
```

---

## 8. AUDIT TRAIL

All admin actions are automatically logged to the `admin_audit_logs` table with:

- Admin ID and email
- Action type (enum: user_suspend, kyc_approve, config_update, etc.)
- Target user/resource
- Timestamp
- IP address
- Metadata (old/new values, reason, etc.)

**Example Audit Actions:**

- `USER_SUSPEND`, `USER_BAN`, `USER_UNLOCK`
- `KYC_APPROVE`, `KYC_REJECT`
- `TRANSACTION_FLAG`
- `CONFIG_UPDATE`, `MAINTENANCE_TOGGLE`
- `BLOCKLIST_ADD`, `BLOCKLIST_REMOVE`
- `FEE_UPDATE`, `PROVIDER_TOGGLE`

---

## 9. ADMIN ENTITIES

### AdminAuditLog

Tracks all admin actions for compliance and accountability.

### Blocklist

Manages blocklisted emails, IPs, cards, countries, wallet addresses.

### SupportTicket

Customer support ticket system with assignment and notes.

### SystemConfig

Key-value configuration store for system-wide settings.

### FraudAlert

Fraud detection alerts with risk scoring and review workflow.

---

## 10. ACCESS TO MONOLITH ENTITIES

Admin service has read/write access to:

- **User**: User accounts, status, KYC status
- **Transaction**: All blockchain transactions
- **KYCDocument**: KYC submissions and documents
- **FiatOrder**: Fiat payment orders
- **Notification**: User notifications
- **Fee**: Platform fee configurations
- **AirtimePurchase, DataPurchase, ElectricityPurchase**: Bill payments
- **MerchantPayment, SplitPayment**: Payment processing

---

## Usage Example

```bash
# List users
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/users?status=active&page=1&limit=20"

# Approve KYC
curl -X POST \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Verified"}' \
  "http://localhost:5401/admin/v2/kyc/kyc_id_123/approve"

# Get fraud alerts
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/fraud-alerts?status=pending"
```

---

## Best Practices

1. **Audit Everything**: All sensitive actions are logged with admin ID, IP, and metadata
2. **Risk Scoring**: KYC risk scores help prioritize reviews
3. **Fraud Detection**: High-velocity transaction detection, pattern analysis
4. **Blocklist Management**: Prevent known bad actors with flexible blocklist types
5. **Support Workflow**: Ticket assignment, status tracking, internal notes
6. **Analytics**: Track DAU/MAU, revenue, provider performance
7. **System Control**: Toggle providers, maintenance mode, update fees dynamically

---

## Development Notes

- All services follow TypeORM pattern with repositories
- No direct `process.env` access - uses shared `env` object
- Follows auth service architecture exactly
- Entity-service-controller separation
- Comprehensive error handling and logging
- IP tracking for all admin actions
