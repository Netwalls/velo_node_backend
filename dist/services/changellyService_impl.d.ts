export declare function createBuyOrder({ userId, amountNgn, crypto, walletAddress, }: {
    userId: string;
    amountNgn: number;
    crypto: string;
    walletAddress: string;
}): Promise<{
    redirectUrl: string | undefined;
    orderId: string;
}>;
export declare function createSellOrder({ userId, amountCrypto, crypto, }: {
    userId: string;
    amountCrypto: number;
    crypto: string;
}): Promise<{
    redirectUrl: string | undefined;
    orderId: string;
}>;
export declare function getOrderStatus(orderId: string): Promise<unknown>;
//# sourceMappingURL=changellyService_impl.d.ts.map