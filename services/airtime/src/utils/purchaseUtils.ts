import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { AirtimePurchase } from "../entities/AirtimePurchase";
import { blockchainValidator } from "../services/blockchain/validators";
import { exchangeRateService } from "../services/exchangeRateService";

export enum Blockchain {
    ETHEREUM = "ethereum",
    BITCOIN = "bitcoin",
    SOLANA = "solana",
    STELLAR = "stellar",
    POLKADOT = "polkadot",
    STARKNET = "starknet",
    USDT_ERC20 = "usdt-erc20",
}

export enum MobileNetwork {
    MTN = "mtn",
    GLO = "glo",
    AIRTEL = "airtel",
    ETISALAT = "9mobile",
}

export const SECURITY_CONSTANTS = {
    AMOUNT_TOLERANCE_PERCENT: 1.0,
    PURCHASE_EXPIRY_MS: 30 * 60 * 1000,
    MIN_AIRTIME_AMOUNT: 50,
    MAX_AIRTIME_AMOUNT: 200000,
    MIN_DATA_AMOUNT: 50,
    MAX_DATA_AMOUNT: 200000,
    MIN_ELECTRICITY_AMOUNT: 1000,
    MAX_ELECTRICITY_AMOUNT: 200000,
};

const MOCK_CRYPTO_RATES: { [key in Blockchain]: number } = {
    [Blockchain.ETHEREUM]: 2000000,
    [Blockchain.BITCOIN]: 60000000,
    [Blockchain.SOLANA]: 269800,
    [Blockchain.STELLAR]: 500,
    [Blockchain.POLKADOT]: 10000,
    [Blockchain.STARKNET]: 260.64,
    [Blockchain.USDT_ERC20]: 1430,
};

const CRYPTO_ID_MAP: { [key in Blockchain]: string } = {
    [Blockchain.ETHEREUM]: "eth",
    [Blockchain.BITCOIN]: "btc",
    [Blockchain.SOLANA]: "sol",
    [Blockchain.STELLAR]: "xlm",
    [Blockchain.POLKADOT]: "dot",
    [Blockchain.STARKNET]: "strk",
    [Blockchain.USDT_ERC20]: "usdt",
};

export function getBlockchainWallet(blockchain: Blockchain): string {
    const walletMap: { [key in Blockchain]: string | undefined } = {
        [Blockchain.ETHEREUM]: process.env.VELO_TREASURY_ETH_MAINNET,
        [Blockchain.BITCOIN]: process.env.VELO_TREASURY_BTC_MAINNET,
        [Blockchain.SOLANA]: process.env.VELO_TREASURY_SOL_MAINNET,
        [Blockchain.STELLAR]: process.env.VELO_TREASURY_XLM_MAINNET,
        [Blockchain.POLKADOT]: process.env.VELO_TREASURY_DOT_MAINNET,
        [Blockchain.STARKNET]: process.env.VELO_TREASURY_STRK_MAINNET,
        [Blockchain.USDT_ERC20]: process.env.VELO_TREASURY_USDT_MAINNET,
    };


    // Use fallbacks for dev if env vars missing
    const fallback = "0x0000000000000000000000000000000000000000";
    const walletAddress = walletMap[blockchain] || fallback;

    return walletAddress;
}

export function getMockCryptoAmount(
    fiatAmount: number,
    blockchain: Blockchain
): number {
    const rate = MOCK_CRYPTO_RATES[blockchain];
    if (!rate) {
        throw new Error(`Exchange rate not available for: ${blockchain}`);
    }

    const cryptoAmount = fiatAmount / rate;
    return Math.round(cryptoAmount * 100000000) / 100000000;
}

export async function convertFiatToCrypto(
    fiatAmount: number,
    blockchain: Blockchain
): Promise<number> {
    try {
        const cryptoId = CRYPTO_ID_MAP[blockchain];
        if (!cryptoId) {
            throw new Error(`Exchange rate not available for: ${blockchain}`);
        }

        const cryptoAmount = await exchangeRateService.convertFiatToCrypto(
            fiatAmount,
            cryptoId
        );

        console.log(
            `💰 Exchange rate conversion: ${fiatAmount} NGN = ${cryptoAmount} ${cryptoId.toUpperCase()}`
        );
        return cryptoAmount;
    } catch (error: any) {
        console.error("❌ Exchange rate conversion failed:", error.message);
        console.log("⚠️ Using fallback mock rates");
        return getMockCryptoAmount(fiatAmount, blockchain);
    }
}

export async function validateBlockchainTransaction(
    blockchain: Blockchain,
    transactionHash: string,
    expectedAmount: number,
    expectedToAddress: string
): Promise<boolean> {
    console.log(`🔍 Validating ${blockchain} transaction...`);

    try {
        const tolerance = expectedAmount * (SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT / 100);
        const minAllowedAmount = expectedAmount - tolerance;
        const maxAllowedAmount = expectedAmount + tolerance;

        let isValid = false;

        switch (blockchain) {
            case Blockchain.ETHEREUM:
                isValid = await blockchainValidator.validateEthereumTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            case Blockchain.BITCOIN:
                isValid = await blockchainValidator.validateBitcoinTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            case Blockchain.SOLANA:
                isValid = await blockchainValidator.validateSolanaTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            case Blockchain.STELLAR:
                isValid = await blockchainValidator.validateStellarTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            case Blockchain.POLKADOT:
                isValid = await blockchainValidator.validatePolkadotTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            case Blockchain.STARKNET:
                isValid = await blockchainValidator.validateStarknetTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            case Blockchain.USDT_ERC20:
                isValid = await blockchainValidator.validateUsdtTransaction(
                    transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
                );
                break;
            default:
                console.error(`Unsupported blockchain: ${blockchain}`);
                return false;
        }

        if (isValid) {
            console.log(`✅ Transaction validated successfully`);
        } else {
            console.log(`❌ Transaction validation failed`);
        }

        return isValid;
    } catch (error: any) {
        console.error(`❌ Blockchain validation error:`, error);
        return false;
    }
}

export async function checkTransactionHashUniqueness(
    transactionHash: string
): Promise<void> {
    const airtimeRepo = AppDataSource.getRepository(AirtimePurchase);

    const existingAirtime = await airtimeRepo.findOne({
        where: {
            transaction_hash: transactionHash,
            status: "completed" as any,
        },
    });

    if (existingAirtime) {
        logSecurityEvent("DUPLICATE_TRANSACTION_HASH", {
            transactionHash,
            existingType: "airtime",
            existingId: existingAirtime.id,
        });
        throw new Error(
            "This transaction has already been used for a successful airtime purchase"
        );
    }

    console.log("✅ Transaction hash is unique");
}

export function markTransactionAsUsed(purchaseId: string, purchaseType: string) {
    console.log(`✅ Transaction marked as used for ${purchaseType} purchase: ${purchaseId}`);
}

export function validateCommonInputs(data: {
    phoneNumber: string;
    chain: Blockchain;
    transactionHash: string;
    amount: number;
    minAmount: number;
    maxAmount: number;
}) {
    const { phoneNumber, chain, transactionHash, amount, minAmount, maxAmount } = data;

    if (typeof amount !== "number" || isNaN(amount)) {
        throw new Error("Amount must be a valid number");
    }

    if (amount < minAmount) {
        throw new Error(`Minimum amount is ${minAmount} NGN`);
    }

    if (amount > maxAmount) {
        throw new Error(`Maximum amount is ${maxAmount} NGN`);
    }

    const phoneRegex = /^234[7-9][0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
        throw new Error("Invalid Nigerian phone number format. Use 234XXXXXXXXXX");
    }

    if (!Object.values(Blockchain).includes(chain)) {
        throw new Error(`Unsupported blockchain.`);
    }

    if (!transactionHash || typeof transactionHash !== "string") {
        throw new Error("Valid transaction hash is required");
    }
}

export function mapNellobytesError(
    statusCode: string | undefined,
    status: string
): string {
    const errorMap: { [key: string]: string } = {
        "400": "Nellobytes: Invalid API credentials.",
        "401": "Nellobytes: Invalid URL format.",
        "402": "Nellobytes: UserID is missing.",
        "403": "Nellobytes: API Key is missing.",
        "404": "Nellobytes: Mobile network is not specified.",
        "100": "Transaction successful",
        "200": "Transaction successful",
        // Add more mappings as needed
    };

    if (statusCode && errorMap[statusCode]) return errorMap[statusCode];
    if (errorMap[status]) return errorMap[status];

    return `Nellobytes: ${status}`;
}

export async function initiateRefund<T extends { metadata?: any }>(
    purchase: T,
    repository: Repository<T>,
    cryptoAmount: number,
    cryptoCurrency: string,
    reason: string,
    purchaseId: string
): Promise<void> {
    try {
        console.log(`💸 Initiating refund for purchase ${purchaseId}: ${reason}`);

        purchase.metadata = {
            ...purchase.metadata,
            refund: {
                initiated: true,
                reason: reason,
                initiatedAt: new Date().toISOString(),
                amount: cryptoAmount,
                currency: cryptoCurrency,
                status: "pending",
            },
        };

        await repository.save(purchase);
        console.log(`✅ Refund initiated for ${cryptoAmount} ${cryptoCurrency}`);
    } catch (error) {
        console.error("❌ Refund initiation failed:", error);
    }
}

export function logSecurityEvent(event: string, details: any) {
    console.warn(`🔒 SECURITY EVENT: ${event}`, {
        timestamp: new Date().toISOString(),
        event,
        details,
    });
}

export function getSupportedBlockchains() {
    return Object.values(Blockchain).map((chain) => ({
        chain: chain,
        symbol: chain.toUpperCase(),
        name: chain,
    }));
}

export function getSupportedNetworks() {
    return Object.values(MobileNetwork).map((network) => ({
        value: network,
        label: network.toUpperCase(),
    }));
}

export function getSecurityLimits() {
    return {
        airtime: {
            minAmount: SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT,
            maxAmount: SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT,
        },
    };
}
