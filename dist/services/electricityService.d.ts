import { ElectricityPurchase, ElectricityCompany, MeterType } from "../entities/ElectricityPurchase";
import { Blockchain } from "../utils/purchaseUtils";
export declare class ElectricityService {
    private electricityPurchaseRepo;
    private readonly COMPANY_MAP;
    constructor();
    private getRepository;
    /**
     * Process electricity payment with comprehensive validation
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
     * Verify meter number before payment
     */
    verifyMeterNumber(company: ElectricityCompany, meterNumber: string): Promise<any>;
    /**
     * Validate purchase data
     */
    private validatePurchaseData;
    /**
     * Mark purchase as failed
     */
    private markPurchaseFailed;
    getUserElectricityHistory(userId: string, limit?: number): Promise<ElectricityPurchase[]>;
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
export declare const electricityService: ElectricityService;
//# sourceMappingURL=electricityService.d.ts.map