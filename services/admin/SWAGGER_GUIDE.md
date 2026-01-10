# Swagger API Documentation - Quick Start

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd services/admin
npm install
```

This will install:

- `swagger-jsdoc` - Generate OpenAPI spec from JSDoc comments
- `swagger-ui-express` - Serve Swagger UI
- `typeorm` - Database ORM
- `reflect-metadata` - Required for TypeORM decorators

### 2. Start the Admin Service

```bash
npm run dev
```

### 3. Access Swagger UI

Open your browser and navigate to:

```
http://localhost:5401/api-docs
```

You'll see a beautiful interactive API documentation with:

- ✅ All 40+ endpoints organized by module
- ✅ Request/response schemas
- ✅ "Try it out" functionality for testing
- ✅ Example values and descriptions

### 4. Test Endpoints via Swagger UI

**Step-by-step:**

1. **Click "Authorize" button** (top right)
2. **Enter your admin API key:**
   ```
   Value: <your INTERNAL_API_KEY from .env>
   ```
3. **Click "Authorize"** then **"Close"**

4. **Expand any endpoint** (e.g., GET /admin/v2/users)
5. **Click "Try it out"**
6. **Fill in parameters** (optional - search, status, etc.)
7. **Click "Execute"**
8. **View the response** below

---

## 📚 API Documentation Structure

### Tags (Modules)

- **User Management** - List, suspend, ban, unlock users
- **Transaction Monitoring** - Search, flag, export transactions
- **KYC/AML Compliance** - Review and approve KYC documents
- **Fraud & Risk** - Fraud alerts and blocklist management
- **Customer Support** - Support ticket workflow
- **Analytics** - DAU/MAU, charts, revenue metrics
- **System Configuration** - Config, maintenance mode, provider toggle

---

## 🔧 Testing Examples

### Example 1: List Users

```bash
# Via Swagger UI
1. Navigate to User Management → GET /admin/v2/users
2. Click "Try it out"
3. Set parameters:
   - search: "john"
   - status: "active"
   - page: 1
   - limit: 10
4. Click "Execute"
```

### Example 2: Approve KYC

```bash
# Via Swagger UI
1. Navigate to KYC/AML Compliance → POST /admin/v2/kyc/{kycId}/approve
2. Click "Try it out"
3. Enter kycId: "your-kyc-uuid"
4. Request body:
   {
     "notes": "All documents verified successfully"
   }
5. Click "Execute"
```

### Example 3: Add to Blocklist

```bash
# Via Swagger UI
1. Navigate to Fraud & Risk → POST /admin/v2/blocklist
2. Click "Try it out"
3. Request body:
   {
     "type": "email",
     "value": "fraud@example.com",
     "reason": "Known fraudster",
     "expiresAt": "2025-12-31T00:00:00Z"
   }
4. Click "Execute"
```

---

## 🧪 Testing via cURL (Alternative)

If you prefer command line:

```bash
# List users
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/users?status=active&page=1&limit=10"

# Get user details
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/users/user-uuid-here"

# Suspend user
curl -X POST \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Suspicious activity"}' \
  "http://localhost:5401/admin/v2/users/user-uuid-here/suspend"

# List pending KYC
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/kyc?status=pending&page=1&limit=20"

# Approve KYC
curl -X POST \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Documents verified"}' \
  "http://localhost:5401/admin/v2/kyc/kyc-uuid-here/approve"

# Get fraud alerts
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/fraud-alerts?status=pending"

# Get DAU analytics
curl -H "x-admin-key: YOUR_KEY" \
  "http://localhost:5401/admin/v2/analytics/dau?startDate=2024-01-01&endDate=2024-12-31"

# Toggle maintenance mode
curl -X POST \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' \
  "http://localhost:5401/admin/v2/config/maintenance-mode"
```

---

## 📊 Swagger Features

### Interactive Testing

- **Try it out** - Test endpoints directly from the browser
- **Auto-fill** - Example values provided for all fields
- **Response preview** - See JSON responses with syntax highlighting
- **Request/Response schemas** - Full type definitions
- **Parameter validation** - Know required vs optional fields

### Documentation

- **Organized by tags** - Easy navigation by module
- **Request body examples** - See what data to send
- **Response examples** - Know what to expect
- **Status codes** - Understand success/error responses
- **Security** - API key authentication documented

---

## 🎯 Common Use Cases

### 1. User Management

```
GET /admin/v2/users - Search and filter users
GET /admin/v2/users/{userId} - Get full user profile
POST /admin/v2/users/{userId}/suspend - Suspend suspicious user
POST /admin/v2/users/{userId}/unlock - Reactivate user
```

### 2. KYC Review Workflow

```
GET /admin/v2/kyc?status=pending - Get review queue
GET /admin/v2/kyc/{kycId} - View KYC with risk score
POST /admin/v2/kyc/{kycId}/approve - Approve KYC
POST /admin/v2/kyc/{kycId}/reject - Reject with reason
```

### 3. Fraud Detection

```
GET /admin/v2/fraud-alerts?status=pending - Get pending alerts
POST /admin/v2/fraud-alerts/{alertId}/review - Review alert
POST /admin/v2/blocklist - Block email/IP/card
GET /admin/v2/fraud-stats - View fraud metrics
```

### 4. Transaction Monitoring

```
GET /admin/v2/transactions?userId=xxx - Filter by user
GET /admin/v2/transactions?minAmount=1000 - High-value txns
POST /admin/v2/transactions/{id}/flag - Flag for review
GET /admin/v2/transactions-export - Export to CSV
```

### 5. Analytics Dashboard

```
GET /admin/v2/analytics/dau - Daily active users chart
GET /admin/v2/analytics/transaction-volume - Volume over time
GET /admin/v2/analytics/provider-performance - Provider success rates
GET /admin/v2/analytics/revenue - Fee revenue metrics
```

---

## 🔐 Security

- **API Key Required** - All endpoints require `x-admin-key` header
- **Audit Logging** - All actions logged with admin ID and IP
- **IP Tracking** - Every action records the IP address
- **Role-based** - Admin ID tracked for accountability

---

## 📝 Export Swagger Spec

Get the raw OpenAPI spec:

```bash
curl http://localhost:5401/api-docs.json > admin-api-spec.json
```

This JSON file can be:

- Imported into Postman
- Used with code generators
- Shared with frontend teams
- Versioned in git

---

## 🎉 Summary

You now have:

- ✅ **Interactive API documentation** at `/api-docs`
- ✅ **40+ documented endpoints** with full schemas
- ✅ **"Try it out" testing** directly in browser
- ✅ **OpenAPI 3.0 spec** exportable as JSON
- ✅ **Organized by modules** for easy navigation
- ✅ **Request/response examples** for all endpoints

**Next Steps:**

1. Run `npm install` in services/admin
2. Start service: `npm run dev`
3. Open http://localhost:5401/api-docs
4. Click "Authorize" and enter your API key
5. Start testing! 🚀
