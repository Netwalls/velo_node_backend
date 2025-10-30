export declare enum TransactionType {
    CREDIT = "CREDIT",// Money coming in (deposits, refunds)
    DEBIT = "DEBIT"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare class UserTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    token: string;
    chain: string;
    network: 'mainnet' | 'testnet';
    amount: number;
    status: TransactionStatus;
    reference?: string;
    description?: string;
    metadata?: any;
    createdAt: Date;
    completedAt?: Date;
}
//# sourceMappingURL=UserTransaction.d.ts.map