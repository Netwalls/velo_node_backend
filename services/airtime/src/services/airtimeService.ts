import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import {
    AirtimePurchase,
    AirtimePurchaseStatus,
} from "../entities/AirtimePurchase";
import { isSuccessfulResponse } from "./nellobytesService";
import {
    Blockchain,
    MobileNetwork,
    SECURITY_CONSTANTS,
    getBlockchainWallet,
    convertFiatToCrypto,
    validateBlockchainTransaction,
    checkTransactionHashUniqueness,
    markTransactionAsUsed,
    validateCommonInputs,
    initiateRefund,
    logSecurityEvent,
    getSupportedBlockchains,
    getSupportedNetworks,
    getSecurityLimits,
} from "../utils/purchaseUtils";

export class AirtimeService {
    private airtimePurchaseRepo: Repository<AirtimePurchase> | null = null;

    constructor() {
        this.airtimePurchaseRepo = null;
    }

    private getRepository(): Repository<AirtimePurchase> {
        if (!this.airtimePurchaseRepo) {
            this.airtimePurchaseRepo = AppDataSource.getRepository(AirtimePurchase);
        }
        return this.airtimePurchaseRepo!;
    }

    async processAirtimePurchase(
        userId: string,
        purchaseData: {
            type: "airtime";
            amount: number;
            chain: Blockchain;
            phoneNumber: string;
            mobileNetwork: MobileNetwork;
            transactionHash: string;
        }
    ) {
        console.log(
            `🔄 Processing airtime purchase for user ${userId}:`,
            purchaseData
        );

        let airtimePurchase: AirtimePurchase | null = null;

        try {
            this.validatePurchaseData(purchaseData);

            await checkTransactionHashUniqueness(purchaseData.transactionHash);

            const expectedCryptoAmount = await convertFiatToCrypto(
                purchaseData.amount,
                purchaseData.chain
            );

            const receivingWallet = getBlockchainWallet(purchaseData.chain);

            console.log(
                `💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`
            );

            airtimePurchase = new AirtimePurchase();
            airtimePurchase.user_id = userId;
            airtimePurchase.network = purchaseData.mobileNetwork;
            airtimePurchase.blockchain = purchaseData.chain;
            airtimePurchase.crypto_amount = expectedCryptoAmount;
            airtimePurchase.crypto_currency = purchaseData.chain.toUpperCase();
            airtimePurchase.fiat_amount = purchaseData.amount;
            airtimePurchase.phone_number = purchaseData.phoneNumber;
            airtimePurchase.transaction_hash = purchaseData.transactionHash;
            airtimePurchase.status = AirtimePurchaseStatus.PROCESSING;

            await this.getRepository().save(airtimePurchase);

            console.log(
                `🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`
            );

            const isValid = await validateBlockchainTransaction(
                purchaseData.chain,
                purchaseData.transactionHash,
                expectedCryptoAmount,
                receivingWallet
            );

            if (!isValid) {
                await this.markPurchaseFailed(
                    airtimePurchase,
                    "Transaction validation failed"
                );
                throw new Error(
                    "Transaction validation failed. Please check the transaction details."
                );
            }

            console.log(`✅ Transaction validated! Proceeding to airtime delivery...`);

            const providerResult = await this.processAirtimeWithNellobytes(
                airtimePurchase
            );

            airtimePurchase.status = AirtimePurchaseStatus.COMPLETED;
            airtimePurchase.provider_reference = providerResult.orderid;
            airtimePurchase.metadata = {
                providerResponse: providerResult,
                processedAt: new Date().toISOString(),
                security: {
                    validatedAt: new Date().toISOString(),
                    amountTolerance: SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
                },
            };
            await this.getRepository().save(airtimePurchase);

            markTransactionAsUsed(airtimePurchase.id, "airtime");

            console.log(
                `🎉 Airtime delivered! ${purchaseData.amount} NGN to ${purchaseData.phoneNumber}`
            );

            return {
                success: true,
                message: `Airtime purchase successful! ${purchaseData.amount
                    } NGN ${purchaseData.mobileNetwork.toUpperCase()} airtime delivered to ${purchaseData.phoneNumber
                    }`,
                data: {
                    purchaseId: airtimePurchase.id,
                    airtimeAmount: purchaseData.amount,
                    network: purchaseData.mobileNetwork,
                    phoneNumber: purchaseData.phoneNumber,
                    providerReference: providerResult.orderid,
                    cryptoAmount: expectedCryptoAmount,
                    cryptoCurrency: purchaseData.chain.toUpperCase(),
                    deliveredAt: new Date(),
                },
            };
        } catch (error: any) {
            console.error("❌ Airtime purchase failed:", error);

            if (airtimePurchase && airtimePurchase.id) {
                await this.markPurchaseFailed(airtimePurchase, error.message);

                if (airtimePurchase.status === AirtimePurchaseStatus.PROCESSING) {
                    await initiateRefund(
                        airtimePurchase,
                        this.getRepository(),
                        airtimePurchase.crypto_amount,
                        airtimePurchase.crypto_currency,
                        error.message,
                        airtimePurchase.id
                    );
                }
            }

            throw error;
        }
    }

    private async processAirtimeWithNellobytes(purchase: AirtimePurchase) {
        try {
            console.log(
                `📞 Calling Nellobytes API for ${purchase.fiat_amount} NGN ${purchase.network} to ${purchase.phone_number}`
            );

            // Dynamic import to avoid circular dep if any, but regular import is fine
            const { default: nellobytesService } = await import("./nellobytesService");

            const providerResult = await nellobytesService.purchaseAirtimeSimple(
                purchase.network,
                purchase.fiat_amount,
                purchase.phone_number,
                `VELO_${purchase.id}_${Date.now()}`
            );

            console.log(`📞 Nellobytes API response:`, providerResult);

            if (
                isSuccessfulResponse(providerResult) ||
                providerResult.status === "ORDER_RECEIVED"
            ) {
                console.log(`✅ Nellobytes order successful: ${providerResult.orderid}`);
                return providerResult;
            } else {
                throw new Error(`Nellobytes API error: ${providerResult.statuscode} - ${providerResult.status}`);
            }
        } catch (error: any) {
            console.error(`❌ Nellobytes API call failed:`, error.message);

            if (error.message.includes("Nellobytes:")) {
                throw error;
            }

            throw new Error(`Nellobytes: ${error.message}`);
        }
    }

    private validatePurchaseData(purchaseData: any) {
        const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } =
            purchaseData;

        if (type !== "airtime") {
            throw new Error("Invalid purchase type");
        }

        if (!Object.values(MobileNetwork).includes(mobileNetwork)) {
            throw new Error(
                `Invalid mobile network. Supported: ${Object.values(MobileNetwork).join(
                    ", "
                )}`
            );
        }

        validateCommonInputs({
            phoneNumber,
            chain,
            transactionHash,
            amount,
            minAmount: SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT,
            maxAmount: SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT,
        });

        console.log("✅ Input validation passed");
    }

    private async markPurchaseFailed(purchase: AirtimePurchase, reason: string) {
        purchase.status = AirtimePurchaseStatus.FAILED;
        purchase.metadata = {
            ...purchase.metadata,
            error: reason,
            failedAt: new Date().toISOString(),
            security: {
                validationFailed: true,
                failedAt: new Date().toISOString(),
            },
        };
        await this.getRepository().save(purchase);

        logSecurityEvent("PURCHASE_FAILED", {
            purchaseId: purchase.id,
            reason,
            userId: purchase.user_id,
            fiatAmount: purchase.fiat_amount,
            cryptoAmount: purchase.crypto_amount,
            network: purchase.network,
        });
    }

    async getUserAirtimeHistory(userId: string, limit: number = 10) {
        return await this.getRepository().find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }

    async getExpectedCryptoAmount(fiatAmount: number, chain: Blockchain) {
        if (
            fiatAmount < SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT ||
            fiatAmount > SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT
        ) {
            throw new Error(
                `Amount must be between ${SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT} and ${SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT} NGN`
            );
        }

        const cryptoAmount = await convertFiatToCrypto(fiatAmount, chain);

        return {
            cryptoAmount,
            cryptoCurrency: chain.toUpperCase(),
            fiatAmount,
            chain,
            minAmount: SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT,
            maxAmount: SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT,
            tolerancePercent: SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
            instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} from your wallet to complete the airtime purchase`,
        };
    }

    getSupportedBlockchains() {
        return getSupportedBlockchains();
    }

    getSupportedNetworks() {
        return getSupportedNetworks();
    }

    getSecurityLimits() {
        return getSecurityLimits().airtime;
    }
}

export const airtimeService = new AirtimeService();
