/**
 * USDTService handles USDT-specific operations including:
 * - Getting USDT addresses for users
 * - Fetching USDT balances from blockchain
 * - Transferring USDT to user addresses
 */
export declare class USDTService {
    /**
     * Get user's USDT addresses for all supported networks
     */
    static getUserUSDTAddresses(userId: string): Promise<{
        erc20: {
            mainnet: string;
            testnet: string;
        };
        trc20: {
            mainnet: string;
            testnet: string;
        };
    }>;
    /**
     * Get USDT balance from blockchain (all networks combined)
     * In production, this would query actual blockchain APIs
     */
    static getUSDTBalanceFromBlockchain(userId: string): Promise<{
        erc20: {
            mainnet: number;
            testnet: number;
        };
        trc20: {
            mainnet: number;
            testnet: number;
        };
        total: number;
    }>;
    /**
     * Get ERC-20 USDT balance from Ethereum network
     * In production, integrate with Ethereum providers like Infura, Alchemy
     */
    private static getERC20Balance;
    /**
     * Get TRC-20 USDT balance from Tron network
     * In production, integrate with Tron providers
     */
    private static getTRC20Balance;
    /**
     * Transfer USDT to user's address after conversion
     * In production, this would execute actual blockchain transactions
     */
    static transferUSDTToUser(userId: string, amount: number, network?: 'erc20' | 'trc20'): Promise<{
        success: boolean;
        txHash?: string;
        address?: string;
        amount: number;
        network: string;
    }>;
    /**
     * Update user's USDT balance in database
     */
    private static updateDatabaseBalance;
    /**
     * Generate simulated transaction hash for testing
     */
    private static generateSimulatedTxHash;
    /**
     * Get primary USDT address for receiving conversions (defaults to ERC-20 mainnet)
     */
    static getPrimaryUSDTAddress(userId: string): Promise<string>;
}
//# sourceMappingURL=usdtService.d.ts.map