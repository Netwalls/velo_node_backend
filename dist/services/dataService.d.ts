import { DataPurchase } from "../entities/DataPurchase";
import { NellobytesDataPlan } from "./nellobytesService";
import { Blockchain, MobileNetwork } from "../utils/purchaseUtils";
export declare class DataService {
    private dataPurchaseRepo;
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
     * Process data purchase with comprehensive validation
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
     * Process data with Nellobytesystems
     */
    private processDataWithNellobytes;
    /**
     * Get data plan by ID
     */
    private getDataPlanById;
    /**
     * Validate purchase data
     */
    private validatePurchaseData;
    /**
     * Mark purchase as failed
     */
    private markPurchaseFailed;
    getDataPlans(network: MobileNetwork): Promise<NellobytesDataPlan[]>;
    forceRefreshDataPlans(): Promise<void>;
    getUserDataHistory(userId: string, limit?: number): Promise<DataPurchase[]>;
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
        minAmount: number;
        maxAmount: number;
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