import { Request } from 'express';
import { User } from '../entities/User';

export interface AuthRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export enum KYCStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ChainType {
  ETHEREUM = 'ethereum',
  BITCOIN = 'bitcoin',
  POLYGON = 'polygon',
  BSC = 'bsc',
  SOLANA = 'solana'
}
