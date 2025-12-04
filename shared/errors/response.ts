// shared/errors/response.ts
import { Response } from 'express';
import { AppError } from './index';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    timestamp: string;
    path?: string;
    details?: any;
  };
}

export const sendError = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Unknown error → hide in prod
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : (error as any)?.message || 'Unknown error';

  console.error('UNHANDLED ERROR:', error);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      timestamp: new Date().toISOString(),
    },
  });
};