import { Repository } from "typeorm";
export declare enum Blockchain {
    ETHEREUM = "ethereum",
    BITCOIN = "bitcoin",
    SOLANA = "solana",
    STELLAR = "stellar",
    POLKADOT = "polkadot",
    STARKNET = "starknet",
    USDT_ERC20 = "usdt-erc20"
}
export declare enum MobileNetwork {
    MTN = "mtn",
    GLO = "glo",
    AIRTEL = "airtel",
    ETISALAT = "9mobile"
}
export declare const SECURITY_CONSTANTS: {
    AMOUNT_TOLERANCE_PERCENT: number;
    PURCHASE_EXPIRY_MS: number;
    MIN_AIRTIME_AMOUNT: number;
    MAX_AIRTIME_AMOUNT: number;
    MIN_DATA_AMOUNT: number;
    MAX_DATA_AMOUNT: number;
    MIN_ELECTRICITY_AMOUNT: number;
    MAX_ELECTRICITY_AMOUNT: number;
};
/**
 * SHARED: Get blockchain wallet address
 */
export declare function getBlockchainWallet(blockchain: Blockchain): string;
/**
 * SHARED: Convert fiat to crypto with fallback to mock rates
 */
export declare function convertFiatToCrypto(fiatAmount: number, blockchain: Blockchain): Promise<number>;
/**
 * SHARED: Get mock crypto amount (fallback)
 */
export declare function getMockCryptoAmount(fiatAmount: number, blockchain: Blockchain): number;
/**
 * SHARED: Validate blockchain transaction with amount tolerance
 */
export declare function validateBlockchainTransaction(blockchain: Blockchain, transactionHash: string, expectedAmount: number, expectedToAddress: string): Promise<boolean>;
/**
 * SHARED: Check if transaction hash has been successfully used
 * Only checks transactions that completed successfully (COMPLETED status)
 */
export declare function checkTransactionHashUniqueness(transactionHash: string): Promise<void>;
/**
 * SHARED: Mark transaction hash as used (called only after successful Nellobytes response)
 * This is implicit - the purchase status is set to COMPLETED only after Nellobytes succeeds
 */
export declare function markTransactionAsUsed(purchaseId: string, purchaseType: string): void;
/**
 * SHARED: Common input validation
 */
export declare function validateCommonInputs(data: {
    phoneNumber: string;
    chain: Blockchain;
    transactionHash: string;
    amount: number;
    minAmount: number;
    maxAmount: number;
}): void;
/**
 * SHARED: Map Nellobytes error codes to user-friendly messages
 */
export declare function mapNellobytesError(statusCode: string | undefined, status: string): string;
/**
 * SHARED: Initiate refund
 */
export declare function initiateRefund<T extends {
    metadata?: any;
}>(purchase: T, repository: Repository<T>, cryptoAmount: number, cryptoCurrency: string, reason: string, purchaseId: string): Promise<void>;
/**
 * SHARED: Log security events
 */
export declare function logSecurityEvent(event: string, details: any): void;
/**
 * SHARED: Get supported blockchains
 */
export declare function getSupportedBlockchains(): {
    chain: Blockchain;
    symbol: string;
    name: string;
}[];
/**
 * SHARED: Get supported networks
 */
export declare function getSupportedNetworks(): {
    value: MobileNetwork;
    label: string;
    name: string;
}[];
/**
 * SHARED: Get security limits
 */
export declare function getSecurityLimits(): {
    airtime: {
        minAmount: number;
        maxAmount: number;
    };
    data: {
        minAmount: number;
        maxAmount: number;
    };
    electricity: {
        minAmount: number;
        maxAmount: number;
    };
    amountTolerancePercent: number;
    purchaseExpiryMinutes: number;
};
//# sourceMappingURL=purchaseUtils.d.ts.map