import { AirtimePurchase, MobileNetwork, Blockchain } from "../entities/AirtimePurchase";
export declare class AirtimeService {
    private airtimePurchaseRepo;
    private readonly MIN_AIRTIME_AMOUNT;
    private readonly MAX_AIRTIME_AMOUNT;
    private readonly AMOUNT_TOLERANCE_PERCENT;
    private readonly PURCHASE_EXPIRY_MS;
    constructor();
    private getRepository;
    /**
     * SECURE: Process airtime purchase with comprehensive validation
     */
    processAirtimePurchase(userId: string, purchaseData: {
        type: "airtime";
        amount: number;
        chain: Blockchain;
        phoneNumber: string;
        mobileNetwork: MobileNetwork;
        transactionHash: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: {
            purchaseId: string;
            airtimeAmount: number;
            network: MobileNetwork;
            phoneNumber: string;
            providerReference: string | undefined;
            cryptoAmount: number;
            cryptoCurrency: string;
            deliveredAt: Date;
        };
    }>;
    /**
     * Process airtime with Nellobytesystems with proper error handling
     */
    private processAirtimeWithNellobytes;
    /**
     * Map Nellobytes error codes to user-friendly messages
     */
    private mapNellobytesError;
    /**
     * Initiate refund when airtime delivery fails
     */
    private initiateRefund;
    /**
     * SECURITY: Comprehensive input validation
     */
    private validatePurchaseData;
    /**
     * SECURITY: Check transaction hash uniqueness
     */
    private checkTransactionHashUniqueness;
    /**
     * SECURITY: Enhanced blockchain validation with amount tolerance
     */
    private validateBlockchainTransaction;
    /**
     * SECURITY: Real blockchain validation with amount tolerance
     */
    private realBlockchainValidation;
    /**
     * SECURITY: Mark purchase as failed with reason
     */
    private markPurchaseFailed;
    /**
     * SECURITY: Log security events
     */
    private logSecurityEvent;
    /**
     * Get company's wallet address (static as requested)
     */
    private getBlockchainWallet;
    /**
     * Convert fiat to crypto with validation
     */
    private convertFiatToCrypto;
    private getMockCryptoAmount;
    getUserAirtimeHistory(userId: string, limit?: number): Promise<AirtimePurchase[]>;
    getExpectedCryptoAmount(fiatAmount: number, chain: Blockchain): Promise<{
        cryptoAmount: number;
        cryptoCurrency: string;
        fiatAmount: number;
        chain: Blockchain;
        minAmount: number;
        maxAmount: number;
        tolerancePercent: number;
        instructions: string;
    }>;
    getSupportedBlockchains(): {
        chain: Blockchain;
        symbol: string;
        name: string;
    }[];
    getSupportedNetworks(): {
        value: MobileNetwork;
        label: string;
        name: string;
    }[];
    /**
     * SECURITY: Get security limits for frontend
     */
    getSecurityLimits(): {
        minAirtimeAmount: number;
        maxAirtimeAmount: number;
        amountTolerancePercent: number;
        purchaseExpiryMinutes: number;
    };
    getUserPurchaseStats(userId: string): Promise<{
        totalPurchases: number;
        totalSpent: number;
        successfulPurchases: number;
        averagePurchase: number;
    }>;
    getRecentPurchases(userId: string, limit?: number): Promise<AirtimePurchase[]>;
}
export declare const airtimeService: AirtimeService;
//# sourceMappingURL=airtimeService.d.ts.map