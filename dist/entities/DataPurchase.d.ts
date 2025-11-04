import { User } from './User';
export declare enum DataPurchaseStatus {
    PENDING = "pending",// Waiting for crypto payment
    PROCESSING = "processing",// Crypto received, processing data
    COMPLETED = "completed",// Data sent successfully
    FAILED = "failed"
}
export declare enum MobileNetwork {
    MTN = "mtn",
    GLO = "glo",
    AIRTEL = "airtel",
    ETISALAT = "9mobile"
}
export declare enum Blockchain {
    ETHEREUM = "ethereum",
    BITCOIN = "bitcoin",
    SOLANA = "solana",
    STELLAR = "stellar",
    POLKADOT = "polkadot",
    STARKNET = "starknet",
    USDT_ERC20 = "usdt-erc20"
}
export declare class DataPurchase {
    id: string;
    user: User;
    user_id: string;
    network: MobileNetwork;
    status: DataPurchaseStatus;
    plan_name: string;
    dataplan_id: string;
    blockchain: string;
    crypto_amount: number;
    crypto_currency: string;
    fiat_amount: number;
    phone_number: string;
    transaction_hash?: string;
    provider_reference?: string;
    metadata?: any;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=DataPurchase.d.ts.map