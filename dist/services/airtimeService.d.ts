import { AirtimePurchase } from "../entities/AirtimePurchase";
import { Blockchain, MobileNetwork } from "../utils/purchaseUtils";
export declare class AirtimeService {
    private airtimePurchaseRepo;
    constructor();
    private getRepository;
    /**
     * Process airtime purchase with comprehensive validation
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
     * Process airtime with Nellobytesystems
     */
    private processAirtimeWithNellobytes;
    /**
     * Validate purchase data
     */
    private validatePurchaseData;
    /**
     * Mark purchase as failed
     */
    private markPurchaseFailed;
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
    getSecurityLimits(): {
        minAmount: number;
        maxAmount: number;
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