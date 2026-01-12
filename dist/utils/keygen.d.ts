import { Account, RpcProvider } from "starknet";
interface UsdcWalletInfo {
    address: string;
    privateKey: string;
    publicKey?: string;
    note?: string;
}
interface GeneratedUsdcWallet {
    evm: UsdcWalletInfo;
    solana: UsdcWalletInfo;
    starknet: UsdcWalletInfo;
}
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
export declare function encrypt(text: string): string;
export declare function decrypt(text: string): string;
/**
 * Generate wallets capable of receiving USDC on all Rhino.fi supported chains.
 * Production-ready: secure random keys, same structure as your other generators.
 * Addresses are identical on mainnet/testnet for these chains.
 */
export declare function generateUsdcWallet(): GeneratedUsdcWallet;
export declare function generateEthWallet(): {
    mainnet: {
        address: string;
        privateKey: string;
    };
    testnet: {
        address: string;
        privateKey: string;
    };
};
export declare function generateBtcWallet(): {
    mainnet: {
        address: string;
        privateKey: string;
    };
    testnet: {
        address: string;
        privateKey: string;
    };
};
export declare function generateSolWallet(): {
    mainnet: {
        address: string;
        privateKey: string;
    };
    testnet: {
        address: string;
        privateKey: string;
    };
};
export declare function generateStellarWallet(): {
    mainnet: {
        address: any;
        privateKey: any;
    };
    testnet: {
        address: any;
        privateKey: any;
    };
};
export declare function generatePolkadotWallet(): Promise<{
    mainnet: {
        address: any;
        privateKey: string;
        network: string;
        format: number;
    };
    testnet: {
        address: any;
        privateKey: string;
        network: string;
        format: number;
    };
    mnemonic: any;
    publicKey: string;
}>;
/**
 * Helper function to recover Polkadot wallet from stored privateKey
 */
export declare function recoverPolkadotWallet(privateKeyJson: string): Promise<any>;
/**
 * Helper to check if an address is valid for Paseo
 */
export declare function validatePaseoAddress(address: string): boolean;
/**
 * Generate Starknet wallet for both mainnet and testnet
 */
export declare function generateStrkWallet(customPrivateKey?: string): GeneratedWallet;
export declare function checkBalance(provider: RpcProvider, address: string, minBalance?: bigint, // 0.5 STRK minimum for deployment
preferStrk?: boolean): Promise<{
    balance: bigint;
    hasSufficientFunds: boolean;
    token: "STRK" | "ETH";
}>;
/**
 * Deploy Starknet wallet
 */
export declare function deployStrkWallet(provider: RpcProvider, privateKey: string, publicKey: string, address: string, checkBalanceFirst?: boolean): Promise<{
    account: Account;
    transactionHash: string;
    contractAddress: string;
}>;
export {};
//# sourceMappingURL=keygen.d.ts.map