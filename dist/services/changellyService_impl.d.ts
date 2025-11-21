export declare function createBuyOrder({ userId, amountNgn, crypto, walletAddress }: {
    userId: any;
    amountNgn: any;
    crypto: any;
    walletAddress: any;
}): Promise<{
    redirectUrl: any;
    orderId: string;
}>;
export declare function createSellOrder({ userId, amountCrypto, crypto }: {
    userId: any;
    amountCrypto: any;
    crypto: any;
}): Promise<{
    redirectUrl: any;
    orderId: string;
}>;
export declare function getOrderStatus(orderId: any): Promise<unknown>;
//# sourceMappingURL=changellyService_impl.d.ts.map