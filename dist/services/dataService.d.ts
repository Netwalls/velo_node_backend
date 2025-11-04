import { DataPurchase, MobileNetwork, Blockchain } from "../entities/DataPurchase";
import { NellobytesDataPlan } from "./nellobytesService";
export declare class DataService {
    private dataPurchaseRepo;
    private readonly MIN_DATA_AMOUNT;
    private readonly MAX_DATA_AMOUNT;
    private readonly AMOUNT_TOLERANCE_PERCENT;
    private readonly PURCHASE_EXPIRY_MS;
    private dataPlansCache;
    private plansCacheTimestamp;
    private readonly CACHE_DURATION_MS;
    constructor();
    private getRepository;
    /**
     * Fetch and cache data plans from Nellobytes API
     */
    private refreshDataPlans;
    /**
     * SECURE: Process data purchase with comprehensive validation
     */
    processDataPurchase(userId: string, purchaseData: {
        type: "data";
        dataplanId: string;
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
            planName: string;
            planAmount: string;
            validity: string;
            network: MobileNetwork;
            phoneNumber: string;
            providerReference: string | undefined;
            cryptoAmount: number;
            cryptoCurrency: string;
            deliveredAt: Date;
        };
    }>;
    /**
     * Process data with Nellobytesystems with proper error handling
     * NOTE: We send dataplan_id, NOT amount
     */
    private processDataWithNellobytes;
    /**
     * Map Nellobytes error codes to user-friendly messages
     */
    private mapNellobytesError;
    /**
     * Initiate refund when data delivery fails
     */
    private initiateRefund;
    /**
     * Get data plan by ID
     */
    private getDataPlanById;
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
     * Get available data plans for a network (from cache or API)
     */
    getDataPlans(network: MobileNetwork): Promise<NellobytesDataPlan[]>;
    /**
     * Force refresh data plans from API
     */
    forceRefreshDataPlans(): Promise<void>;
    /**
     * Get user's data purchase history
     */
    getUserDataHistory(userId: string, limit?: number): Promise<DataPurchase[]>;
    /**
     * Get expected crypto amount for a data plan
     */
    getExpectedCryptoAmount(dataplanId: string, network: MobileNetwork, chain: Blockchain): Promise<{
        cryptoAmount: number;
        cryptoCurrency: string;
        fiatAmount: number;
        chain: Blockchain;
        planDetails: {
            id: string;
            name: string;
            amount: string;
            validity: string;
        };
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
    getSecurityLimits(): {
        minDataAmount: number;
        maxDataAmount: number;
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
export declare const dataService: DataService;
//# sourceMappingURL=dataService.d.ts.map