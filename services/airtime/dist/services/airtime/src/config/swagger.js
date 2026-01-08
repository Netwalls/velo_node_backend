"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const spec = {
    openapi: '3.0.1',
    info: {
        title: 'VELO Airtime Service API',
        version: '1.0.0',
        description: 'Airtime purchase service for VELO',
    },
    tags: [
        { name: 'Airtime', description: 'Airtime purchase endpoints' },
        { name: 'Health', description: 'Service health endpoints' },
    ],
    servers: [{ url: `http://localhost:${process.env.AIRTIME_PORT || 4004}`, description: 'Local' }],
    paths: {
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Service health',
                responses: {
                    '200': { description: 'OK' },
                },
            },
        },
        '/api/airtime/purchase': {
            post: {
                tags: ['Airtime'],
                security: [{ AUTH: [] }],
                summary: 'Process airtime purchase',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['type', 'amount', 'chain', 'phoneNumber', 'mobileNetwork', 'transactionHash'],
                                properties: {
                                    type: { type: 'string', enum: ['airtime'] },
                                    amount: { type: 'number' },
                                    chain: { type: 'string' },
                                    phoneNumber: { type: 'string' },
                                    mobileNetwork: { type: 'string', enum: ['mtn', 'glo', 'airtel', '9mobile'] },
                                    transactionHash: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Purchase successful' },
                    '400': { description: 'Bad request' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/airtime/expected-amount': {
            get: {
                tags: ['Airtime'],
                summary: 'Get expected crypto amount',
                parameters: [
                    { name: 'amount', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'chain', in: 'query', required: true, schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'Success' },
                    '400': { description: 'Bad request' }
                }
            }
        },
        '/api/airtime/history': {
            get: {
                tags: ['Airtime'],
                security: [{ AUTH: [] }],
                summary: 'Get user airtime history',
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer' } }
                ],
                responses: {
                    '200': { description: 'Success' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/airtime/options': {
            get: {
                tags: ['Airtime'],
                summary: 'Get supported options',
                responses: {
                    '200': { description: 'Success' }
                }
            }
        },
        '/api/airtime/purchase/{purchaseId}': {
            get: {
                tags: ['Airtime'],
                security: [{ AUTH: [] }],
                summary: 'Get specific purchase',
                parameters: [
                    { name: 'purchaseId', in: 'path', required: true, schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'Success' },
                    '404': { description: 'Not found' }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            AUTH: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
    }
};
function setupSwagger(app) {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(spec));
    app.get('/api-docs.json', (_req, res) => res.json(spec));
}
