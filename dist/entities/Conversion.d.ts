import { User } from './User';
export declare enum ConversionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum ConversionType {
    MANUAL = "manual",
    AUTOMATIC = "automatic",
    WEBHOOK = "webhook"
}
export declare class Conversion {
    id: string;
    userId: string;
    user: User;
    fromCurrency: string;
    toCurrency: string;
    inputAmount: number;
    outputAmount: number;
    exchangeRate: number;
    feeAmount: number;
    feeUSD: number;
    slippage: number;
    status: ConversionStatus;
    type: ConversionType;
    fromAddress?: string;
    toAddress?: string;
    txHashFrom?: string;
    txHashTo?: string;
    dexUsed?: string;
    metadata?: any;
    errorMessage?: string;
    createdAt: Date;
    completedAt?: Date;
}
//# sourceMappingURL=Conversion.d.ts.map