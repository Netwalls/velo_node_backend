/**
 * PaymentMonitoringService handles automatic detection of incoming payments
 * and triggers USDT conversions. In production, this would integrate with
 * blockchain monitoring services or payment providers.
 */
export declare class PaymentMonitoringService {
    private static isRunning;
    private static monitoringInterval;
    /**
     * Start monitoring for incoming payments
     */
    static start(): void;
    /**
     * Stop monitoring for incoming payments
     */
    static stop(): void;
    /**
     * Check for incoming payments across all supported blockchains
     * In production, this would be replaced with real blockchain monitoring
     */
    private static checkForIncomingPayments;
    /**
     * Scan all user Stellar addresses for recent incoming payments and process any new ones.
     * This is a lightweight scan (limit recent 20 payments per address) and dedupes by txHash.
     */
    private static scanStellarAddressesForDeposits;
    /**
     * Generic scanner for all user addresses across chains.
     * Calls checkBlockchainForDeposit with amount=0 to detect any incoming transactions
     * and processes them (with deduplication by txHash).
     */
    private static scanAllAddressesForDeposits;
    /**
     * Process a detected incoming payment
     */
    static processIncomingPayment(payment: IncomingPayment): Promise<void>;
    /**
     * Validate that a payment is legitimate and confirmed
     */
    private static validatePayment;
    /**
     * Find user by their wallet address
     */
    private static findUserByAddress;
    /**
     * Get minimum confirmations required for each currency
     */
    private static getMinConfirmations;
    /**
     * Get current monitoring status
     */
    static getStatus(): MonitoringStatus;
    /**
     * Manual payment detection (for testing/simulation)
     */
    static simulatePaymentDetection(payment: IncomingPayment): Promise<void>;
}
/**
 * Interface for incoming payment data
 */
export interface IncomingPayment {
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: number;
    currency: string;
    confirmations: number;
    blockHeight?: number;
    timestamp: Date;
    network?: string;
}
/**
 * Interface for monitoring service status
 */
export interface MonitoringStatus {
    isRunning: boolean;
    startTime: Date | null;
    supportedCurrencies: string[];
    checkInterval: number;
}
//# sourceMappingURL=paymentMonitoringService.d.ts.map