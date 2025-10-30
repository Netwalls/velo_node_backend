import { User } from './User';
export declare enum MerchantPaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare class MerchantPayment {
    id: string;
    userId: string;
    user: User;
    address: string;
    amount: number;
    status: MerchantPaymentStatus;
    txHash: string;
    createdAt: Date;
    completedAt: Date;
    ethAddress: string;
    btcAddress: string;
    solAddress: string;
    strkAddress: string;
    polkadotAddress: string;
    usdtErc20Address: string;
    usdtTrc20Address: string;
    chain: string;
    network: string;
    updatedAt?: Date;
    transactionHash?: string;
    description?: string;
}
//# sourceMappingURL=MerchantPayment.d.ts.map