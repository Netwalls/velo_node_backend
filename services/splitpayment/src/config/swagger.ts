import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3004;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Split Payment Microservice API',
            version: '1.0.0',
            description: 'API documentation for the Split Payment Service. Handles creation and execution of multi-recipient transactions across various blockchains (EVM, Solana, Bitcoin, Stellar, etc.).',
            contact: {
                name: 'API Support',
                email: 'support@velo.finance',
            },
        },
        servers: [
            {
                url: BACKEND_URL,
                description: 'Development Server',
            },
            {
                url: 'https://api.velo.finance/splitpayment',
                description: 'Production Server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                        details: {
                            type: 'string',
                            description: 'Detailed error information (optional)',
                        },
                    },
                },
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/entities/*.ts'], // Scan routes and entities for annotations
};

export const swaggerSpec = swaggerJsdoc(options);
