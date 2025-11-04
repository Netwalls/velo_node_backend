export declare class BlockchainValidator {
    private readonly AMOUNT_TOLERANCE_PERCENT;
    /**
     * Validate Ethereum transaction using Etherscan API (Goerli Testnet)
     */
    validateEthereumTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Bitcoin transaction using Blockchain.com API (Testnet)
     */
    validateBitcoinTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Solana transaction using Solana RPC (Devnet)
     */
    validateSolanaTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Stellar transaction using Horizon API (Testnet)
     */
    validateStellarTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Polkadot transaction using Subscan API (Westend Testnet)
     */
    validatePolkadotTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Starknet transaction using Starknet API (Goerli Testnet)
     */
    validateStarknetTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate USDT ERC-20 transaction using Etherscan (Goerli Testnet)
     */
    validateUsdtTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
}
export declare const blockchainValidator: BlockchainValidator;
//# sourceMappingURL=index.d.ts.map