import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Velo Backend API Documentation",
      version: "1.0.0",
      description: `
Complete authentication and payment backend with multi-chain crypto wallet support.
      
**Features:**
- Multi-user types (Company, Employee, Individual)
- Multi-chain wallet generation (ETH, BTC, SOL, STRK, XLM, DOT, USDC, USDT)
- Bulk payment processing
- Split payments
- QR payments
- Fiat on/off ramp
- Utility payments (Airtime, Data, Electricity)
- KYC management
- Real-time notifications
      `,
      contact: {
        name: "Velo Support",
        email: "support@velo.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:5500",
        description: "Development server",
      },
      {
        url: "https://api.velo.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              example: "Error message description",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            email: {
              type: "string",
              format: "email",
            },
            firstName: {
              type: "string",
              nullable: true,
            },
            lastName: {
              type: "string",
              nullable: true,
            },
            userType: {
              type: "string",
              enum: ["company", "employee", "individual"],
            },
            position: {
              type: "string",
              nullable: true,
            },
            salary: {
              type: "number",
              format: "decimal",
              nullable: true,
            },
            isEmailVerified: {
              type: "boolean",
            },
          },
        },
        Company: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            companyName: {
              type: "string",
            },
            companyEmail: {
              type: "string",
              format: "email",
            },
            companyCode: {
              type: "string",
              description: "Unique 8-character code for employee registration",
            },
            isActive: {
              type: "boolean",
            },
          },
        },
        WalletAddress: {
          type: "object",
          properties: {
            chain: {
              type: "string",
              enum: [
                "ethereum",
                "bitcoin",
                "solana",
                "starknet",
                "stellar",
                "polkadot",
                "usdc-evm",
                "usdc-solana",
                "usdc-starknet",
                "usdt_erc20",
                "usdt_trc20",
              ],
            },
            network: {
              type: "string",
              enum: ["mainnet", "testnet"],
            },
            address: {
              type: "string",
            },
          },
        },
        AuthTokens: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              description: "JWT access token (expires in 1 hour)",
            },
            refreshToken: {
              type: "string",
              description: "Refresh token (expires in 7 days)",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and account management endpoints",
      },
      {
        name: "Company",
        description: "Company-specific endpoints (company owners only)",
      },
      {
        name: "Wallet",
        description: "Crypto wallet operations and management",
      },
      {
        name: "Payments",
        description: "Payment processing endpoints",
      },
      {
        name: "Split Payments",
        description: "Split payment functionality",
      },
      {
        name: "QR Payments",
        description: "QR code payment endpoints",
      },
      {
        name: "Fiat",
        description: "Fiat on/off ramp endpoints",
      },
      {
        name: "Utilities",
        description: "Airtime, data, and electricity payment endpoints",
      },
      {
        name: "Admin",
        description: "Admin-only endpoints",
      },
      {
        name: "Notifications",
        description: "User notification management",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/swagger/*.yaml"], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
