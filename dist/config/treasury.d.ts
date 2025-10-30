/**
 * VELO Treasury Configuration
 *
 * Fee collection wallet addresses for each blockchain network
 * Fees are sent to these addresses after successful transactions
 */
export interface TreasuryWallet {
    address: string;
    chain: string;
    network: string;
    description: string;
}
export declare class TreasuryConfig {
    static getTreasuryWallet(chain: string, network: string): string;
    static isTreasuryConfigured(chain: string, network: string): boolean;
    static getAllTreasuryWallets(): TreasuryWallet[];
    static validateTreasuryAddress(address: string, chain: string): boolean;
}
export default TreasuryConfig;
//# sourceMappingURL=treasury.d.ts.map