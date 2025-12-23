import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../../../../shared/config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Velo Admin Service API',
      version: '2.0.0',
      description: 'Comprehensive Admin Panel for Velo Fintech Platform - 10 Modules for User Management, Transactions, KYC/AML, Fraud Detection, Support, Analytics, and System Configuration',
      contact: {
        name: 'Velo Team',
        email: 'admin@velo.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 5401}`,
        description: 'Development server',
      },
      {
        url: 'https://admin.velo.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        AdminApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-key',
          description: 'Admin API key for authentication (use INTERNAL_API_KEY)',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            kycStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            amount: { type: 'number' },
            chain: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
            txHash: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        KYCDocument: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            documentType: { type: 'string' },
            documentUrl: { type: 'string' },
            submittedAt: { type: 'string', format: 'date-time' },
            reviewedAt: { type: 'string', format: 'date-time' },
          },
        },
        FraudAlert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['high_velocity', 'suspicious_amount', 'multiple_cards', 'chargeback_risk', 'unusual_pattern', 'blocklisted_match'],
            },
            status: { type: 'string', enum: ['pending', 'reviewed', 'confirmed_fraud', 'false_positive'] },
            riskScore: { type: 'number', minimum: 0, maximum: 100 },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SupportTicket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            subject: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assignedTo: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Blocklist: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['email', 'phone', 'ip', 'card', 'country', 'wallet_address'] },
            value: { type: 'string' },
            reason: { type: 'string' },
            isActive: { type: 'boolean' },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SystemConfig: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            key: { type: 'string' },
            value: { type: 'string' },
            description: { type: 'string' },
            updatedBy: { type: 'string', format: 'uuid' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AdminAuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            adminId: { type: 'string', format: 'uuid' },
            adminEmail: { type: 'string', format: 'email' },
            action: { type: 'string' },
            targetUserId: { type: 'string', format: 'uuid' },
            targetResource: { type: 'string' },
            description: { type: 'string' },
            metadata: { type: 'object' },
            ipAddress: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        AdminApiKey: [],
      },
    ],
    tags: [
      { name: 'User Management', description: 'User CRUD, suspend/ban/unlock operations' },
      { name: 'Transaction Monitoring', description: 'Transaction search, stats, flagging, and export' },
      { name: 'KYC/AML Compliance', description: 'KYC review, approve/reject, risk scoring' },
      { name: 'Fraud & Risk', description: 'Fraud alerts and blocklist management' },
      { name: 'Customer Support', description: 'Support ticket workflow and management' },
      { name: 'Analytics', description: 'DAU/MAU, charts, cohort analysis, revenue metrics' },
      { name: 'System Configuration', description: 'Config management, maintenance mode, provider toggle' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
