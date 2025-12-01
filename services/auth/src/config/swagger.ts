import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../../../../shared/config/env';

const spec = {
  openapi: '3.0.1',
  info: {
    title: 'VELO Auth Service API',
    version: '1.0.0',
    description: 'Authentication service for VELO - register, login, password reset, OTP',
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints (public)' },
    { name: 'Health', description: 'Service health endpoints' },
  ],
  servers: [{ url: `http://localhost:${env.PORT || 3001}`, description: 'Local' }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health',
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Register a new user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          '201': { description: 'User created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          '200': {
            description: 'Login success',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' }, examples: { success: { value: { user: { id: 'user_123', email: 'alice@example.com' }, accessToken: 'ey..access', refreshToken: 'ey..refresh' } } } } },
          },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidCredentials: {
                    summary: 'Invalid credentials',
                    value: {
                      success: false,
                      error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid credentials',
                        timestamp: new Date().toISOString(),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Google sign-in / register',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GoogleSignInRequest' } } } },
        responses: {
          '200': { description: 'Signed in', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Verify OTP',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOTPRequest' } } } },
        responses: {
          '200': { description: 'OTP verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': { description: 'Invalid OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/resend-otp': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Resend OTP to user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResendOTPRequest' } } } },
        responses: {
          '200': { description: 'OTP resent' },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        security: [{ AUTH: [] }],
        summary: 'Logout and revoke refresh token',
        requestBody: { required: false },
        responses: { '200': { description: 'Logged out' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Request a password reset',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } } },
        responses: {
          '200': { description: 'Password reset email sent' },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      AUTH: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Provide a JWT token as: `Bearer <token>`' },
    },
    schemas: {
      User: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } },
      AuthResponse: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string' }, refreshToken: { type: 'string' } } },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, details: { type: 'object', additionalProperties: true } } },
        },
      },
      RegisterRequest: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] },
      LoginRequest: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] },
      GoogleSignInRequest: { type: 'object', properties: { idToken: { type: 'string' } }, required: ['idToken'] },
      VerifyOTPRequest: { type: 'object', properties: { email: { type: 'string' }, otp: { type: 'string' } }, required: ['email', 'otp'] },
      ResendOTPRequest: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
      ForgotPasswordRequest: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec as any, { explorer: true, swaggerOptions: { persistAuthorization: true } }));
  app.get('/api-docs.json', (_req, res) => res.json(spec));
}

export default spec;
