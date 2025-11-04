import { User } from './User';
export declare enum ElectricityPurchaseStatus {
    PENDING = "pending",// Waiting for crypto payment
    PROCESSING = "processing",// Crypto received, processing payment
    COMPLETED = "completed",// Payment successful
    FAILED = "failed"
}
export declare enum ElectricityCompany {
    EKO_ELECTRIC = "eko_electric",// 01
    IKEJA_ELECTRIC = "ikeja_electric",// 02
    ABUJA_ELECTRIC = "abuja_electric",// 03
    KANO_ELECTRIC = "kano_electric",// 04
    PORTHARCOURT_ELECTRIC = "portharcourt_electric",// 05
    JOS_ELECTRIC = "jos_electric",// 06
    IBADAN_ELECTRIC = "ibadan_electric",// 07
    KADUNA_ELECTRIC = "kaduna_electric",// 08
    ENUGU_ELECTRIC = "enugu_electric",// 09
    BENIN_ELECTRIC = "benin_electric",// 10
    YOLA_ELECTRIC = "yola_electric",// 11
    ABA_ELECTRIC = "aba_electric"
}
export declare enum MeterType {
    PREPAID = "prepaid",// 01
    POSTPAID = "postpaid"
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
export declare class ElectricityPurchase {
    id: string;
    user: User;
    user_id: string;
    company: ElectricityCompany;
    company_code: string;
    meter_type: MeterType;
    meter_type_code: string;
    meter_number: string;
    phone_number: string;
    status: ElectricityPurchaseStatus;
    blockchain: string;
    crypto_amount: number;
    crypto_currency: string;
    fiat_amount: number;
    transaction_hash?: string;
    provider_reference?: string;
    meter_token?: string;
    metadata?: any;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=ElectricityPurchase.d.ts.map