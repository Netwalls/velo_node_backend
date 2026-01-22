# Velo API Documentation

## 📚 Access the Interactive Documentation

Once the server is running, you can access the interactive Swagger UI at:

**Local Development:**

```
http://localhost:5500/api-docs
```

**Production:**

```
https://api.velo.com/api-docs
```

## 🚀 Quick Start

### 1. Start the Server

```bash
npm run dev
```

### 2. Open Swagger UI

Navigate to `http://localhost:5500/api-docs` in your browser

### 3. Authenticate

For protected endpoints:

1. Register or login to get an access token
2. Click the "Authorize" button in Swagger UI
3. Enter: `Bearer <your-access-token>`
4. Click "Authorize"

## 📋 API Overview

### Base URL

- **Development:** `http://localhost:5500`
- **Production:** `https://api.velo.com`

### Authentication

All protected endpoints require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## 🔐 Authentication Endpoints

### Registration

#### Company Registration

```http
POST /auth/register/company
```

**Body:**

```json
{
  "companyName": "Tech Corp Inc",
  "email": "admin@techcorp.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "message": "Company registered successfully. Please verify your email.",
  "userId": "uuid",
  "companyCode": "ABC12345",
  "companyName": "Tech Corp Inc",
  "addresses": [...]
}
```

#### Employee Registration

```http
POST /auth/register/employee
```

**Body:**

```json
{
  "companyCode": "ABC12345",
  "email": "employee@techcorp.com",
  "password": "SecurePass123!"
}
```

#### Individual Registration

```http
POST /auth/register/individual
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Login

```http
POST /auth/login
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "userType": "individual",
    "isEmailVerified": true
  }
}
```

### Email Verification

```http
POST /auth/verify-otp
```

**Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Password Reset

```http
POST /auth/forgot-password
```

**Body:**

```json
{
  "email": "user@example.com"
}
```

## 👥 Company Endpoints (Protected)

### Get Company Employees

```http
GET /auth/company/employees
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "message": "Employees retrieved successfully",
  "companyName": "Tech Corp Inc",
  "totalEmployees": 5,
  "employees": [
    {
      "id": "uuid",
      "email": "employee@techcorp.com",
      "name": "John Doe",
      "walletAddress": "0x1234...5678",
      "position": "Software Engineer",
      "salary": 75000.0
    }
  ]
}
```

## 💼 Supported Features

### Multi-Chain Wallets

Every user gets wallets automatically generated for:

- **Ethereum** (Mainnet & Testnet)
- **Bitcoin** (Mainnet & Testnet)
- **Solana** (Mainnet & Testnet)
- **Starknet** (Mainnet & Testnet)
- **Stellar** (Mainnet & Testnet)
- **Polkadot** (Mainnet & Testnet)
- **USDC** (EVM, Solana, Starknet)
- **USDT** (ERC-20, TRC-20)

### Payment Types

- Bulk/Batch payments
- Split payments
- QR code payments
- Merchant payments

### Fiat Services

- Fiat on-ramp (Changelly, MoonPay)
- Fiat off-ramp
- Bank integration

### Utility Services

- Airtime purchase
- Data bundle purchase
- Electricity bill payment

## 🔧 Development

### Generate OpenAPI JSON

```bash
curl http://localhost:5500/api-docs.json > openapi.json
```

### Testing with Postman

1. Import the OpenAPI spec: `http://localhost:5500/api-docs.json`
2. Postman will auto-generate a collection
3. Set up environment variables for tokens

### Testing with cURL

**Register:**

```bash
curl -X POST http://localhost:5500/auth/register/individual \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

**Login:**

```bash
curl -X POST http://localhost:5500/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

**Access Protected Endpoint:**

```bash
curl -X GET http://localhost:5500/auth/company/employees \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Response Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request                          |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found                            |
| 409  | Conflict (resource already exists)   |
| 500  | Internal Server Error                |

## 🔒 Security

- All passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Rate limiting enabled on sensitive endpoints
- Email verification required before login
- Private keys encrypted at rest

## 📝 Notes

- All timestamps are in ISO 8601 format
- All decimal values (balances, prices) use appropriate precision
- UUIDs are used for all entity IDs
- Email addresses must be unique across the system
- Company codes are 8-character alphanumeric strings

## 🆘 Support

For API support, contact: support@velo.com

## 📄 License

MIT License
