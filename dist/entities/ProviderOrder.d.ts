export declare enum ProviderOrderStatus {
    CREATED = "created",
    PENDING = "pending",
    PAID = "paid",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class ProviderOrder {
    id: string;
    userId?: string;
    requestId: string;
    mobileNetwork: string;
    mobileNumber?: string;
    chain?: string;
    amountNGN: number;
    token: string;
    requiredTokenAmount?: number;
    status: ProviderOrderStatus;
    depositTxHash?: string;
    providerResponse?: any;
    network?: 'mainnet' | 'testnet';
    createdAt: Date;
    updatedAt: Date;
}
export default ProviderOrder;
//# sourceMappingURL=ProviderOrder.d.ts.map