# VELO Airtime Microservice

This microservice handles airtime purchases for the VELO platform. It integrates with the Nellobytes provider to facilitate airtime top-ups across various Nigerian mobile networks (MTN, GLO, Airtel, 9mobile). It also includes blockchain transaction validation to ensure payments are received before processing orders.

## 🚀 Features

*   **Airtime Purchase**: Buy airtime for any supported network.
*   **Blockchain Validation**: Verifies crypto transactions (ETH, BTC, SOL, etc.) before fulfilling orders.
*   **Rate Limiting**: Protects against abuse with configurable rate limits.
*   **Security**: Prevents double-spending by checking transaction hash uniqueness.
*   **Swagger Documentation**: Interactive API documentation.
*   **Dockerized**: Ready for containerized deployment.

## 🛠️ Technology Stack

*   **Runtime**: Node.js
*   **Language**: TypeScript
*   **Framework**: Express.js
*   **Database**: PostgreSQL (via TypeORM)
*   **Documentation**: Swagger (OpenAPI 3.0)

## 📂 Project Structure

```
services/airtime/
├── src/
│   ├── config/         # Database and Swagger config
│   ├── controllers/    # Request handlers
│   ├── entities/       # Database models (TypeORM)
│   ├── middleware/     # Auth and validation middleware
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic (Airtime, Blockchain, Nellobytes)
│   ├── utils/          # Helper functions and templates
│   └── server.ts       # Entry point
├── Dockerfile          # Docker build instructions
├── .env.example        # Environment variable template
└── package.json        # Dependencies
```

## 🏁 Getting Started

### Prerequisites

*   Node.js (v18+)
*   PostgreSQL running locally or via Docker
*   A Nellobytes API account (or valid credentials)

### Installation

1.  Navigate to the service directory:
    ```bash
    cd services/airtime
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    *   Update `.env` with your database credentials and API keys.

### Running Locally

Start the development server:

```bash
npm run dev
```

The service will run on **http://localhost:4004** (or the port specified in `.env`).

### Running with Docker

You can run this service as part of the implementation's docker-compose fleet:

```bash
docker-compose up --build airtime
```

## 📚 API Documentation

Once the server is running, you can access the interactive Swagger documentation at:

**[http://localhost:4004/api-docs](http://localhost:4004/api-docs)**

### Key Endpoints

*   `POST /api/airtime/purchase`: Initiate an airtime purchase.
*   `GET /api/airtime/history`: Fetch user purchase history.
*   `GET /api/airtime/expected-amount`: Calculate crypto equivalent for a fiat amount.
*   `GET /api/airtime/options`: List supported networks and blockchains.

## 🔒 Security

*   **Authentication**: Most endpoints require a valid JWT token (`Authorization: Bearer <token>`).
*   **Transaction Hashing**: Every purchase requires a unique blockchain transaction hash to prevent replay attacks.
*   **Rate Limiting**: 3 requests per minute per IP for sensitive endpoints.

## 🧪 Testing

(Coming Soon)
```bash
npm test
```
