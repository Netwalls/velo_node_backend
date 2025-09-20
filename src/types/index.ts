export enum NetworkType {
    MAINNET = 'mainnet',
    TESTNET = 'testnet',
}
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
    REJECTED = 'rejected',
}

export enum ChainType {
    ETHEREUM = 'ethereum',
    BITCOIN = 'bitcoin',
    POLYGON = 'polygon',
    BSC = 'bsc',
    SOLANA = 'solana',
    STARKNET = 'starknet',
}

export enum NotificationType {
    LOGIN = 'login',
    LOGOUT = 'logout',
    REGISTRATION = 'registration',
    SEND_MONEY = 'send_money',
    RECEIVE_MONEY = 'receive_money',
    SWAP = 'swap',
    DEPOSIT = 'deposit',
    WITHDRAWAL = 'withdrawal',
    OTP_VERIFIED = 'otp_verified',
    PASSWORD_CHANGE = 'password_change',
    SECURITY_ALERT = 'security_alert',
}
