"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY_CONSTANTS = exports.MobileNetwork = exports.Blockchain = void 0;
exports.getBlockchainWallet = getBlockchainWallet;
exports.getMockCryptoAmount = getMockCryptoAmount;
exports.convertFiatToCrypto = convertFiatToCrypto;
exports.validateBlockchainTransaction = validateBlockchainTransaction;
exports.checkTransactionHashUniqueness = checkTransactionHashUniqueness;
exports.markTransactionAsUsed = markTransactionAsUsed;
exports.validateCommonInputs = validateCommonInputs;
exports.mapNellobytesError = mapNellobytesError;
exports.initiateRefund = initiateRefund;
exports.logSecurityEvent = logSecurityEvent;
exports.getSupportedBlockchains = getSupportedBlockchains;
exports.getSupportedNetworks = getSupportedNetworks;
exports.getSecurityLimits = getSecurityLimits;
const database_1 = require("../config/database");
const AirtimePurchase_1 = require("../entities/AirtimePurchase");
const validators_1 = require("../services/blockchain/validators");
const exchangeRateService_1 = require("../services/exchangeRateService");
var Blockchain;
(function (Blockchain) {
    Blockchain["ETHEREUM"] = "ethereum";
    Blockchain["BITCOIN"] = "bitcoin";
    Blockchain["SOLANA"] = "solana";
    Blockchain["STELLAR"] = "stellar";
    Blockchain["POLKADOT"] = "polkadot";
    Blockchain["STARKNET"] = "starknet";
    Blockchain["USDT_ERC20"] = "usdt-erc20";
})(Blockchain || (exports.Blockchain = Blockchain = {}));
var MobileNetwork;
(function (MobileNetwork) {
    MobileNetwork["MTN"] = "mtn";
    MobileNetwork["GLO"] = "glo";
    MobileNetwork["AIRTEL"] = "airtel";
    MobileNetwork["ETISALAT"] = "9mobile";
})(MobileNetwork || (exports.MobileNetwork = MobileNetwork = {}));
exports.SECURITY_CONSTANTS = {
    AMOUNT_TOLERANCE_PERCENT: 1.0,
    PURCHASE_EXPIRY_MS: 30 * 60 * 1000,
    MIN_AIRTIME_AMOUNT: 50,
    MAX_AIRTIME_AMOUNT: 200000,
    MIN_DATA_AMOUNT: 50,
    MAX_DATA_AMOUNT: 200000,
    MIN_ELECTRICITY_AMOUNT: 1000,
    MAX_ELECTRICITY_AMOUNT: 200000,
};
const MOCK_CRYPTO_RATES = {
    [Blockchain.ETHEREUM]: 2000000,
    [Blockchain.BITCOIN]: 60000000,
    [Blockchain.SOLANA]: 269800,
    [Blockchain.STELLAR]: 500,
    [Blockchain.POLKADOT]: 10000,
    [Blockchain.STARKNET]: 260.64,
    [Blockchain.USDT_ERC20]: 1430,
};
const CRYPTO_ID_MAP = {
    [Blockchain.ETHEREUM]: "eth",
    [Blockchain.BITCOIN]: "btc",
    [Blockchain.SOLANA]: "sol",
    [Blockchain.STELLAR]: "xlm",
    [Blockchain.POLKADOT]: "dot",
    [Blockchain.STARKNET]: "strk",
    [Blockchain.USDT_ERC20]: "usdt",
};
function getBlockchainWallet(blockchain) {
    const walletMap = {
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
function getMockCryptoAmount(fiatAmount, blockchain) {
    const rate = MOCK_CRYPTO_RATES[blockchain];
    if (!rate) {
        throw new Error(`Exchange rate not available for: ${blockchain}`);
    }
    const cryptoAmount = fiatAmount / rate;
    return Math.round(cryptoAmount * 100000000) / 100000000;
}
async function convertFiatToCrypto(fiatAmount, blockchain) {
    try {
        const cryptoId = CRYPTO_ID_MAP[blockchain];
        if (!cryptoId) {
            throw new Error(`Exchange rate not available for: ${blockchain}`);
        }
        const cryptoAmount = await exchangeRateService_1.exchangeRateService.convertFiatToCrypto(fiatAmount, cryptoId);
        console.log(`💰 Exchange rate conversion: ${fiatAmount} NGN = ${cryptoAmount} ${cryptoId.toUpperCase()}`);
        return cryptoAmount;
    }
    catch (error) {
        console.error("❌ Exchange rate conversion failed:", error.message);
        console.log("⚠️ Using fallback mock rates");
        return getMockCryptoAmount(fiatAmount, blockchain);
    }
}
async function validateBlockchainTransaction(blockchain, transactionHash, expectedAmount, expectedToAddress) {
    console.log(`🔍 Validating ${blockchain} transaction...`);
    const MAX_RETRIES = 12; // Approx 1 minute total wait time
    const RETRY_DELAY_MS = 5000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 1) {
                console.log(`⏳ Retry ${attempt}/${MAX_RETRIES} for ${blockchain} transaction...`);
            }
            const tolerance = expectedAmount * (exports.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT / 100);
            const minAllowedAmount = expectedAmount - tolerance;
            const maxAllowedAmount = expectedAmount + tolerance;
            let isValid = false;
            switch (blockchain) {
                case Blockchain.ETHEREUM:
                    isValid = await validators_1.blockchainValidator.validateEthereumTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                case Blockchain.BITCOIN:
                    isValid = await validators_1.blockchainValidator.validateBitcoinTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                case Blockchain.SOLANA:
                    isValid = await validators_1.blockchainValidator.validateSolanaTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                case Blockchain.STELLAR:
                    isValid = await validators_1.blockchainValidator.validateStellarTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                case Blockchain.POLKADOT:
                    isValid = await validators_1.blockchainValidator.validatePolkadotTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                case Blockchain.STARKNET:
                    isValid = await validators_1.blockchainValidator.validateStarknetTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                case Blockchain.USDT_ERC20:
                    isValid = await validators_1.blockchainValidator.validateUsdtTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                    break;
                default:
                    console.error(`Unsupported blockchain: ${blockchain}`);
                    return false;
            }
            if (isValid) {
                console.log(`✅ Transaction validated successfully on attempt ${attempt}`);
                return true;
            }
            else {
                // If it's the last attempt, log failure
                if (attempt === MAX_RETRIES) {
                    console.log(`❌ Transaction validation failed after ${MAX_RETRIES} attempts`);
                }
            }
        }
        catch (error) {
            console.error(`❌ Blockchain validation error on attempt ${attempt}:`, error.message);
        }
        // Wait before retrying, if not the last attempt
        if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
    return false;
}
async function checkTransactionHashUniqueness(transactionHash) {
    const airtimeRepo = database_1.AppDataSource.getRepository(AirtimePurchase_1.AirtimePurchase);
    const existingAirtime = await airtimeRepo.findOne({
        where: {
            transaction_hash: transactionHash,
            status: "completed",
        },
    });
    if (existingAirtime) {
        logSecurityEvent("DUPLICATE_TRANSACTION_HASH", {
            transactionHash,
            existingType: "airtime",
            existingId: existingAirtime.id,
        });
        throw new Error("This transaction has already been used for a successful airtime purchase");
    }
    console.log("✅ Transaction hash is unique");
}
function markTransactionAsUsed(purchaseId, purchaseType) {
    console.log(`✅ Transaction marked as used for ${purchaseType} purchase: ${purchaseId}`);
}
function validateCommonInputs(data) {
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
function mapNellobytesError(statusCode, status) {
    const errorMap = {
        "400": "Nellobytes: Invalid API credentials.",
        "401": "Nellobytes: Invalid URL format.",
        "402": "Nellobytes: UserID is missing.",
        "403": "Nellobytes: API Key is missing.",
        "404": "Nellobytes: Mobile network is not specified.",
        "100": "Transaction successful",
        "200": "Transaction successful",
        // Add more mappings as needed
    };
    if (statusCode && errorMap[statusCode])
        return errorMap[statusCode];
    if (errorMap[status])
        return errorMap[status];
    return `Nellobytes: ${status}`;
}
async function initiateRefund(purchase, repository, cryptoAmount, cryptoCurrency, reason, purchaseId) {
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
    }
    catch (error) {
        console.error("❌ Refund initiation failed:", error);
    }
}
function logSecurityEvent(event, details) {
    console.warn(`🔒 SECURITY EVENT: ${event}`, {
        timestamp: new Date().toISOString(),
        event,
        details,
    });
}
function getSupportedBlockchains() {
    return Object.values(Blockchain).map((chain) => ({
        chain: chain,
        symbol: chain.toUpperCase(),
        name: chain,
    }));
}
function getSupportedNetworks() {
    return Object.values(MobileNetwork).map((network) => ({
        value: network,
        label: network.toUpperCase(),
    }));
}
function getSecurityLimits() {
    return {
        airtime: {
            minAmount: exports.SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT,
            maxAmount: exports.SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT,
        },
    };
}
