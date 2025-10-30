import { Account, RpcProvider } from 'starknet';
interface NetworkWalletInfo {
    address: string;
    privateKey: string;
    publicKey: string;
    classHash: string;
    accountType: string;
}
interface GeneratedWallet {
    mainnet: NetworkWalletInfo;
    testnet: NetworkWalletInfo;
}
/**
 * Generate Starknet wallet for both mainnet and testnet
 */
export declare function generateStrkWallet(customPrivateKey?: string): GeneratedWallet;
/**
 * Check if address has sufficient balance
 */
export declare function checkBalance(provider: RpcProvider, address: string, minBalance?: bigint): Promise<{
    balance: bigint;
    hasSufficientFunds: boolean;
}>;
/**
 * Deploy Starknet wallet
 */
export declare function deployStrkWallet(provider: RpcProvider, privateKey: string, publicKey: string, address: string, checkBalanceFirst?: boolean): Promise<Account>;
export {};
//# sourceMappingURL=starkgen.d.ts.map