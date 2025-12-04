import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Velo QR Payment Service API',
      version: '1.0.0',
      description: 'A comprehensive API for creating and managing cryptocurrency QR payment requests across multiple blockchains',
      contact: {
        name: 'Velo Development Team',
        email: 'dev@velo.com',
      },
      license: {
        name: 'Private',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server',
      },
      {
        url: 'https://api.velo.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Payments',
        description: 'QR payment request management',
      },
      {
        name: 'Monitoring',
        description: 'Blockchain payment monitoring',
      },
      {
        name: 'Statistics',
        description: 'Payment analytics and statistics',
      },
    ],
    components: {
      schemas: {
        MerchantPayment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique payment identifier',
            },
            userId: {
              type: 'string',
              description: 'User/merchant ID',
            },
            address: {
              type: 'string',
              description: 'Primary cryptocurrency address for selected chain',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Payment amount',
              example: 0.01,
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'cancelled'],
              description: 'Payment status',
            },
            txHash: {
              type: 'string',
              description: 'Blockchain transaction hash',
              nullable: true,
            },
            chain: {
              type: 'string',
              enum: ['ethereum', 'bitcoin', 'solana', 'starknet', 'stellar', 'polkadot', 'usdt-erc20'],
              description: 'Blockchain network',
            },
            network: {
              type: 'string',
              enum: ['mainnet', 'testnet', 'devnet'],
              description: 'Network type',
            },
            description: {
              type: 'string',
              description: 'Payment description',
              nullable: true,
            },
            qrData: {
              type: 'string',
              description: 'QR code data string',
              example: 'ethereum:0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47?amount=0.01',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment completion timestamp',
              nullable: true,
            },
          },
        },
        CreatePaymentRequest: {
          type: 'object',
          required: ['userId', 'amount', 'chain', 'address'],
          properties: {
            userId: {
              type: 'string',
              description: 'User/merchant ID',
              example: 'user-123-uuid',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Payment amount in native currency',
              example: 0.01,
              minimum: 0.000001,
            },
            chain: {
              type: 'string',
              enum: ['ethereum', 'bitcoin', 'solana', 'starknet', 'stellar', 'polkadot', 'usdt-erc20'],
              description: 'Blockchain to use',
              example: 'ethereum',
            },
            network: {
              type: 'string',
              enum: ['mainnet', 'testnet', 'devnet'],
              description: 'Network type (defaults to mainnet)',
              example: 'testnet',
            },
            address: {
              type: 'string',
              description: 'Cryptocurrency address to receive payment',
              example: '0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47',
            },
            description: {
              type: 'string',
              description: 'Optional payment description',
              example: 'Coffee payment - Order #12345',
            },
            ethAddress: {
              type: 'string',
              description: 'Ethereum address (if chain is ethereum)',
            },
            btcAddress: {
              type: 'string',
              description: 'Bitcoin address (if chain is bitcoin)',
            },
            solAddress: {
              type: 'string',
              description: 'Solana address (if chain is solana)',
            },
            strkAddress: {
              type: 'string',
              description: 'Starknet address (if chain is starknet)',
            },
            stellarAddress: {
              type: 'string',
              description: 'Stellar address (if chain is stellar)',
            },
            polkadotAddress: {
              type: 'string',
              description: 'Polkadot address (if chain is polkadot)',
            },
          },
        },
        BlockchainStatus: {
          type: 'object',
          properties: {
            confirmed: {
              type: 'boolean',
              description: 'Whether payment is confirmed on blockchain',
            },
            transactionHash: {
              type: 'string',
              description: 'Blockchain transaction hash',
              nullable: true,
            },
            confirmations: {
              type: 'number',
              description: 'Number of block confirmations',
              nullable: true,
            },
            error: {
              type: 'string',
              description: 'Error message if verification failed',
              nullable: true,
            },
          },
        },
        PaymentStats: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of payments',
            },
            pending: {
              type: 'number',
              description: 'Number of pending payments',
            },
            completed: {
              type: 'number',
              description: 'Number of completed payments',
            },
            cancelled: {
              type: 'number',
              description: 'Number of cancelled payments',
            },
            failed: {
              type: 'number',
              description: 'Number of failed payments',
            },
            totalAmount: {
              type: 'number',
              description: 'Total amount of completed payments',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
