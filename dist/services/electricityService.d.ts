import { ElectricityPurchase, ElectricityCompany, MeterType, Blockchain } from "../entities/ElectricityPurchase";
export declare class ElectricityService {
    private electricityPurchaseRepo;
    private readonly MIN_ELECTRICITY_AMOUNT;
    private readonly MAX_ELECTRICITY_AMOUNT;
    private readonly AMOUNT_TOLERANCE_PERCENT;
    private readonly PURCHASE_EXPIRY_MS;
    private readonly COMPANY_MAP;
    constructor();
    private getRepository;
    /**
     * SECURE: Process electricity payment with comprehensive validation
     */
    processElectricityPayment(userId: string, purchaseData: {
        type: "electricity";
        amount: number;
        chain: Blockchain;
        company: ElectricityCompany;
        meterType: MeterType;
        meterNumber: string;
        phoneNumber: string;
        transactionHash: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: {
            purchaseId: string;
            amount: number;
            company: string;
            meterNumber: string;
            meterType: MeterType;
            meterToken: string | undefined;
            providerReference: string | undefined;
            cryptoAmount: number;
            cryptoCurrency: string;
            processedAt: Date;
        };
    }>;
    /**
     * Process electricity payment with Nellobytesystems
     */
    private processElectricityWithNellobytes;
    /**
     * Verify meter number before payment (optional)
     */
    verifyMeterNumber(company: ElectricityCompany, meterNumber: string): Promise<any>;
    /**
     * Map Nellobytes error codes to user-friendly messages
     */
    private mapNellobytesError;
    /**
     * Initiate refund when payment fails
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
     * SECURITY: Mark purchase as failed
     */
    private markPurchaseFailed;
    /**
     * SECURITY: Log security events
     */
    private logSecurityEvent;
    /**
     * Get company's wallet address
     */
    private getBlockchainWallet;
    /**
     * Convert fiat to crypto
     */
    private convertFiatToCrypto;
    private getMockCryptoAmount;
    /**
     * Get user's electricity payment history
     */
    getUserElectricityHistory(userId: string, limit?: number): Promise<ElectricityPurchase[]>;
    /**
     * Get expected crypto amount
     */
    getExpectedCryptoAmount(amount: number, chain: Blockchain): Promise<{
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
    getSupportedCompanies(): {
        value: string;
        label: string;
        code: string;
        minAmount: number;
        maxAmount: number;
    }[];
    getSupportedMeterTypes(): {
        value: MeterType;
        label: string;
        code: string;
    }[];
    getSecurityLimits(): {
        minElectricityAmount: number;
        maxElectricityAmount: number;
        amountTolerancePercent: number;
        purchaseExpiryMinutes: number;
    };
    getUserPurchaseStats(userId: string): Promise<{
        totalPurchases: number;
        totalSpent: number;
        successfulPurchases: number;
        averagePurchase: number;
    }>;
}
export declare const electricityService: ElectricityService;
//# sourceMappingURL=electricityService.d.ts.map