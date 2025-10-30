export declare class PaymentMonitorService {
    private monitoringIntervals;
    private blockchainConfigs;
    /**
     * Start monitoring a payment
     */
    startMonitoring(paymentId: string): Promise<void>;
    /**
     * Stop monitoring a payment
     */
    stopMonitoring(paymentId: string): void;
    /**
     * Check payment status on the blockchain
     */
    private checkPaymentStatus;
    /**
     * Check Ethereum payment using Etherscan API
     */
    private checkEthereumPayment;
    /**
     * Check Bitcoin payment using BlockCypher API
     */
    private checkBitcoinPayment;
    /**
     * Check Solana payment using Solana RPC
     */
    private checkSolanaPayment;
    /**
     * Check Starknet payment
     */
    private checkStarknetPayment;
    /**
     * Mark payment as complete
     */
    private markPaymentComplete;
    /**
     * Monitor all pending payments (call this on app startup)
     */
    monitorAllPendingPayments(): Promise<void>;
    /**
     * Cleanup - stop all monitoring
     */
    cleanup(): void;
}
//# sourceMappingURL=PaymentMonitorService.d.ts.map