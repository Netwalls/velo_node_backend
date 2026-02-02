export declare class BlockchainValidator {
    private readonly AMOUNT_TOLERANCE_PERCENT;
    validateSolanaTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    validateEthereumTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Bitcoin transaction using Blockchain.com API (Mainnet)
     */
    validateBitcoinTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Stellar transaction using Horizon API (Mainnet)
     */
    validateStellarTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Polkadot transaction using Subscan API (Mainnet)
     */
    validatePolkadotTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate Starknet transaction using Starknet API (Mainnet)
     */
    validateStarknetTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
    /**
     * Validate USDT ERC-20 transaction using Etherscan (Mainnet)
     */
    validateUsdtTransaction(txHash: string, expectedTo: string, minAmount: number, maxAmount: number): Promise<boolean>;
}
export declare const blockchainValidator: BlockchainValidator;
//# sourceMappingURL=index.d.ts.map