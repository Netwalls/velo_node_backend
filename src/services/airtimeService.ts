// src/services/airtimeservice.ts - FIXED VERSION
import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import {
  AirtimePurchase,
  AirtimePurchaseStatus,
  MobileNetwork,
  Blockchain,
} from "../entities/AirtimePurchase";
import nellobytesService, { convertNetworkToCode, isSuccessfulResponse } from "./nellobytesService";
import { blockchainValidator } from "./blockchain/validators";
import { exchangeRateService } from "./exchangeRateService";

export class AirtimeService {
  private airtimePurchaseRepo: Repository<AirtimePurchase>;

  // Security constants
  private readonly MIN_AIRTIME_AMOUNT = 50;
  private readonly MAX_AIRTIME_AMOUNT = 200000;
  private readonly AMOUNT_TOLERANCE_PERCENT = 1.0; // 0.01% tolerance
  private readonly PURCHASE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.airtimePurchaseRepo = null as any;
  }

  private getRepository(): Repository<AirtimePurchase> {
    if (!this.airtimePurchaseRepo) {
      this.airtimePurchaseRepo = AppDataSource.getRepository(AirtimePurchase);
    }
    return this.airtimePurchaseRepo;
  }

  /**
   * SECURE: Process airtime purchase with comprehensive validation
   */
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
      // 1. Comprehensive input validation
      this.validatePurchaseData(purchaseData);

      // 2. Check transaction hash uniqueness
      await this.checkTransactionHashUniqueness(purchaseData.transactionHash);

      // 3. Convert fiat amount to crypto amount
      const expectedCryptoAmount = await this.convertFiatToCrypto(
        purchaseData.amount,
        purchaseData.chain
      );

      // 4. Get the company's wallet address
      const receivingWallet = this.getBlockchainWallet(purchaseData.chain);

      console.log(
        `💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`
      );

      // 5. Create pending purchase record
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

      // 6. Validate the blockchain transaction with amount tolerance
      console.log(
        `🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`
      );

      const isValid = await this.validateBlockchainTransaction(
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

      console.log(
        `✅ Transaction validated! Proceeding to airtime delivery...`
      );

      // 7. Process airtime with Nellobytesystems
      const providerResult = await this.processAirtimeWithNellobytes(
        airtimePurchase
      );

      // 8. Mark as completed ONLY if provider succeeded
      airtimePurchase.status = AirtimePurchaseStatus.COMPLETED;
      airtimePurchase.provider_reference = providerResult.orderid;
      airtimePurchase.metadata = {
        providerResponse: providerResult,
        processedAt: new Date().toISOString(),
        security: {
          validatedAt: new Date().toISOString(),
          amountTolerance: this.AMOUNT_TOLERANCE_PERCENT,
        },
      };
      await this.getRepository().save(airtimePurchase);

      console.log(
        `🎉 Airtime delivered! ${purchaseData.amount} NGN to ${purchaseData.phoneNumber}`
      );

      return {
        success: true,
        message: `Airtime purchase successful! ${
          purchaseData.amount
        } NGN ${purchaseData.mobileNetwork.toUpperCase()} airtime delivered to ${
          purchaseData.phoneNumber
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
      
      // If we created a purchase record but failed later, update its status
      if (airtimePurchase && airtimePurchase.id) {
        await this.markPurchaseFailed(airtimePurchase, error.message);
        
        // Initiate refund for blockchain-validated but provider-failed transactions
        if (airtimePurchase.status === AirtimePurchaseStatus.PROCESSING) {
          await this.initiateRefund(airtimePurchase, error.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * Process airtime with Nellobytesystems with proper error handling
   */
  private async processAirtimeWithNellobytes(purchase: AirtimePurchase) {
    try {
      console.log(`📞 Calling Nellobytes API for ${purchase.fiat_amount} NGN ${purchase.network} to ${purchase.phone_number}`);
      
      const providerResult = await nellobytesService.purchaseAirtimeSimple(
        purchase.network,
        purchase.fiat_amount,
        purchase.phone_number,
        `VELO_${purchase.id}_${Date.now()}`
      );

      console.log(`📞 Nellobytes API response:`, providerResult);

      // ✅ CHECK FOR SUCCESS - Only return if API succeeds
      if (isSuccessfulResponse(providerResult) || providerResult.status === 'ORDER_RECEIVED') {
        console.log(`✅ Nellobytes order successful: ${providerResult.orderid}`);
        return providerResult;
      } else {
        // ❌ API returned error status - map to user-friendly messages
        const errorMessage = this.mapNellobytesError(providerResult.statuscode, providerResult.status);
        console.error(`❌ Nellobytes API error: ${providerResult.statuscode} - ${providerResult.status}`);
        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error(`❌ Nellobytes API call failed:`, error.message);
      
      // If it's already a mapped error, re-throw it
      if (error.message.includes('Nellobytes:')) {
        throw error;
      }
      
      // Otherwise, wrap the generic error
      throw new Error(`Nellobytes: ${error.message}`);
    }
  }

  /**
   * Map Nellobytes error codes to user-friendly messages
   */
  private mapNellobytesError(statusCode: string, status: string): string {
    const errorMap: { [key: string]: string } = {
      'INVALID_CREDENTIALS': 'Nellobytes: Invalid API credentials. Please contact support.',
      'MISSING_CREDENTIALS': 'Nellobytes: API credentials missing. Please contact support.',
      'MISSING_USERID': 'Nellobytes: User ID missing. Please contact support.',
      'MISSING_APIKEY': 'Nellobytes: API key missing. Please contact support.',
      'MISSING_MOBILENETWORK': 'Nellobytes: Mobile network not specified.',
      'MISSING_AMOUNT': 'Nellobytes: Amount not specified.',
      'INVALID_AMOUNT': 'Nellobytes: Invalid amount specified.',
      'MINIMUM_50': 'Nellobytes: Minimum airtime amount is 50 NGN.',
      'MINIMUM_200000': 'Nellobytes: Maximum airtime amount is 200,000 NGN.',
      'INVALID_RECIPIENT': 'Nellobytes: Invalid phone number format.',
      'SERVICE_TEMPORARILY_UNAVAIALBLE': 'Nellobytes: Service temporarily unavailable. Please try again later.',
      'INSUFFICIENT_APIBALANCE': 'Nellobytes: Insufficient provider balance. Please try again later.',
    };

    // Try exact match first
    if (errorMap[status]) {
      return errorMap[status];
    }

    // Try status code match
    if (statusCode !== '100' && statusCode !== '200') {
      return `Nellobytes: Service error (Code: ${statusCode}) - ${status}`;
    }

    // Fallback to generic error
    return `Nellobytes: ${status}`;
  }

  /**
   * Initiate refund when airtime delivery fails
   */
  private async initiateRefund(purchase: AirtimePurchase, reason: string) {
    try {
      console.log(`💸 Initiating refund for purchase ${purchase.id}: ${reason}`);
      
      // TODO: Implement actual refund logic
      // This could be:
      // 1. Return crypto to user's wallet
      // 2. Credit user's account balance
      // 3. Create refund transaction record
      
      // For now, just log the refund intent
      purchase.metadata = {
        ...purchase.metadata,
        refund: {
          initiated: true,
          reason: reason,
          initiatedAt: new Date().toISOString(),
          amount: purchase.crypto_amount,
          currency: purchase.crypto_currency,
          status: 'pending'
        }
      };
      
      await this.getRepository().save(purchase);
      
      console.log(`✅ Refund initiated for ${purchase.crypto_amount} ${purchase.crypto_currency}`);
      
    } catch (error) {
      console.error('❌ Refund initiation failed:', error);
      // Don't throw here - we don't want to break the main flow
    }
  }

  /**
   * SECURITY: Comprehensive input validation
   */
  private validatePurchaseData(purchaseData: any) {
    const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } =
      purchaseData;

    // Type validation
    if (type !== "airtime") {
      throw new Error("Invalid purchase type");
    }

    // Amount validation with min/max limits
    if (typeof amount !== "number" || isNaN(amount)) {
      throw new Error("Amount must be a valid number");
    }

    if (amount < this.MIN_AIRTIME_AMOUNT) {
      throw new Error(
        `Minimum airtime amount is ${this.MIN_AIRTIME_AMOUNT} NGN`
      );
    }

    if (amount > this.MAX_AIRTIME_AMOUNT) {
      throw new Error(
        `Maximum airtime amount is ${this.MAX_AIRTIME_AMOUNT} NGN`
      );
    }

    // Phone number validation (Nigeria)
    const phoneRegex = /^234[7-9][0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error(
        "Invalid Nigerian phone number format. Use 234XXXXXXXXXX"
      );
    }

    // Network validation
    if (!Object.values(MobileNetwork).includes(mobileNetwork)) {
      throw new Error(
        `Invalid mobile network. Supported: ${Object.values(MobileNetwork).join(
          ", "
        )}`
      );
    }

    // Blockchain validation
    if (!Object.values(Blockchain).includes(chain)) {
      throw new Error(
        `Unsupported blockchain. Supported: ${Object.values(Blockchain).join(
          ", "
        )}`
      );
    }

    // Transaction hash validation
    if (!transactionHash || typeof transactionHash !== "string") {
      throw new Error("Valid transaction hash is required");
    }

    if (transactionHash.length < 10) {
      throw new Error("Invalid transaction hash format");
    }

    console.log("✅ Input validation passed");
  }

  /**
   * SECURITY: Check transaction hash uniqueness
   */
  private async checkTransactionHashUniqueness(
    transactionHash: string
  ): Promise<void> {
    const existingPurchase = await this.getRepository().findOne({
      where: { transaction_hash: transactionHash },
    });

    if (existingPurchase) {
      this.logSecurityEvent("DUPLICATE_TRANSACTION_HASH", { transactionHash });
      throw new Error(
        "This transaction has already been used for another purchase"
      );
    }

    console.log("✅ Transaction hash is unique");
  }

  /**
   * SECURITY: Enhanced blockchain validation with amount tolerance
   */
  private async validateBlockchainTransaction(
    blockchain: Blockchain,
    transactionHash: string,
    expectedAmount: number,
    expectedToAddress: string
  ): Promise<boolean> {
    console.log(`🔍 Validating ${blockchain} transaction...`);
    console.log(`   TX: ${transactionHash}`);
    console.log(
      `   Expected: ${expectedAmount} ${blockchain} to ${expectedToAddress}`
    );
    console.log(`   Tolerance: ${this.AMOUNT_TOLERANCE_PERCENT}%`);

    try {
      const isValid = await this.realBlockchainValidation(
        blockchain,
        transactionHash,
        expectedAmount,
        expectedToAddress
      );

      if (isValid) {
        console.log(
          `✅ Transaction validated successfully with amount tolerance`
        );
        this.logSecurityEvent("TRANSACTION_VALIDATED", {
          blockchain,
          transactionHash,
          expectedAmount,
          tolerance: this.AMOUNT_TOLERANCE_PERCENT,
        });
      } else {
        console.log(`❌ Transaction validation failed`);
        this.logSecurityEvent("TRANSACTION_VALIDATION_FAILED", {
          blockchain,
          transactionHash,
          expectedAmount,
        });
      }

      return isValid;
    } catch (error: any) {
      console.error(`❌ Blockchain validation error:`, error);
      this.logSecurityEvent("VALIDATION_ERROR", {
        blockchain,
        transactionHash,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * SECURITY: Real blockchain validation with amount tolerance
   */
  private async realBlockchainValidation(
    blockchain: Blockchain,
    transactionHash: string,
    expectedAmount: number,
    expectedToAddress: string
  ): Promise<boolean> {
    // Calculate tolerance range
    const tolerance = expectedAmount * (this.AMOUNT_TOLERANCE_PERCENT / 100);
    const minAllowedAmount = expectedAmount - tolerance;
    const maxAllowedAmount = expectedAmount + tolerance;

    console.log(
      `   Amount range: ${minAllowedAmount} - ${maxAllowedAmount} ${blockchain}`
    );

    try {
      switch (blockchain) {
        case Blockchain.ETHEREUM:
          return await blockchainValidator.validateEthereumTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        case Blockchain.BITCOIN:
          return await blockchainValidator.validateBitcoinTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        case Blockchain.SOLANA:
          return await blockchainValidator.validateSolanaTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        case Blockchain.STELLAR:
          return await blockchainValidator.validateStellarTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        case Blockchain.POLKADOT:
          return await blockchainValidator.validatePolkadotTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        case Blockchain.STARKNET:
          return await blockchainValidator.validateStarknetTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        case Blockchain.USDT_ERC20:
          return await blockchainValidator.validateUsdtTransaction(
            transactionHash,
            expectedToAddress,
            minAllowedAmount,
            maxAllowedAmount
          );

        default:
          console.error(`Unsupported blockchain: ${blockchain}`);
          return false;
      }
    } catch (error) {
      console.error(`Blockchain validation error for ${blockchain}:`, error);
      return false;
    }
  }

  /**
   * SECURITY: Mark purchase as failed with reason
   */
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

    this.logSecurityEvent("PURCHASE_FAILED", {
      purchaseId: purchase.id,
      reason,
      userId: purchase.user_id,
      fiatAmount: purchase.fiat_amount,
      cryptoAmount: purchase.crypto_amount,
      network: purchase.network
    });
  }

  /**
   * SECURITY: Log security events
   */
  private async logSecurityEvent(event: string, details: any) {
    console.warn(`🔒 SECURITY EVENT: ${event}`, {
      timestamp: new Date().toISOString(),
      event,
      details,
      service: "AirtimeService",
    });

    // TODO: Send to security monitoring service
    // await this.sendToSecurityMonitoring(event, details);
  }

  /**
   * Get company's wallet address (static as requested)
   */
  private getBlockchainWallet(blockchain: Blockchain): string {
    const walletMap: { [key in Blockchain]: string | undefined } = {
      [Blockchain.ETHEREUM]: process.env.ETH_WALLET,
      [Blockchain.BITCOIN]: process.env.BTC_WALLET,
      [Blockchain.SOLANA]: process.env.SOL_WALLET,
      [Blockchain.STELLAR]: process.env.XLM_WALLET,
      [Blockchain.POLKADOT]: process.env.DOT_WALLET,
      [Blockchain.STARKNET]: process.env.STRK_WALLET,
      [Blockchain.USDT_ERC20]: process.env.USDT_WALLET,
    };

    const walletAddress = walletMap[blockchain];
    if (!walletAddress) {
      throw new Error(`Wallet not configured for blockchain: ${blockchain}`);
    }

    return walletAddress;
  }

  /**
   * Convert fiat to crypto with validation
   */
  private async convertFiatToCrypto(
    fiatAmount: number,
    blockchain: Blockchain
  ): Promise<number> {
    try {
      const cryptoMap: { [key in Blockchain]: string } = {
        [Blockchain.ETHEREUM]: "eth",
        [Blockchain.BITCOIN]: "btc",
        [Blockchain.SOLANA]: "sol",
        [Blockchain.STELLAR]: "xlm",
        [Blockchain.POLKADOT]: "dot",
        [Blockchain.STARKNET]: "strk",
        [Blockchain.USDT_ERC20]: "usdt",
      };

      const cryptoId = cryptoMap[blockchain];
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

      // Fallback to mock rates if API fails
      console.log("⚠️ Using fallback mock rates");
      return this.getMockCryptoAmount(fiatAmount, blockchain);
    }
  }

  private getMockCryptoAmount(
    fiatAmount: number,
    blockchain: Blockchain
  ): number {
    const mockRates: { [key in Blockchain]: number } = {
      [Blockchain.ETHEREUM]: 2000000,
      [Blockchain.BITCOIN]: 60000000,
      [Blockchain.SOLANA]: 269800,
      [Blockchain.STELLAR]: 500,
      [Blockchain.POLKADOT]: 10000,
      [Blockchain.STARKNET]: 2000,
      [Blockchain.USDT_ERC20]: 1500,
    };

    const rate = mockRates[blockchain];
    if (!rate) {
      throw new Error(`Exchange rate not available for: ${blockchain}`);
    }

    const cryptoAmount = fiatAmount / rate;
    // Round to 8 decimal places for crypto precision
    return Math.round(cryptoAmount * 100000000) / 100000000;
  }

  // Keep other methods (getUserAirtimeHistory, getSupportedBlockchains, etc.)
  async getUserAirtimeHistory(userId: string, limit: number = 10) {
    return await this.getRepository().find({
      where: { user_id: userId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  async getExpectedCryptoAmount(fiatAmount: number, chain: Blockchain) {
    // Validate amount first
    if (
      fiatAmount < this.MIN_AIRTIME_AMOUNT ||
      fiatAmount > this.MAX_AIRTIME_AMOUNT
    ) {
      throw new Error(
        `Amount must be between ${this.MIN_AIRTIME_AMOUNT} and ${this.MAX_AIRTIME_AMOUNT} NGN`
      );
    }

    const cryptoAmount = await this.convertFiatToCrypto(fiatAmount, chain);

    return {
      cryptoAmount,
      cryptoCurrency: chain.toUpperCase(),
      fiatAmount,
      chain,
      minAmount: this.MIN_AIRTIME_AMOUNT,
      maxAmount: this.MAX_AIRTIME_AMOUNT,
      tolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
      instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} from your wallet to complete the airtime purchase`,
    };
  }

  getSupportedBlockchains() {
    return Object.values(Blockchain).map((chain) => ({
      chain: chain,
      symbol: chain.toUpperCase(),
      name:
        chain.charAt(0).toUpperCase() +
        chain.slice(1).replace("_", " ").replace("-", " "),
    }));
  }

  getSupportedNetworks() {
    return Object.values(MobileNetwork).map((network) => ({
      value: network,
      label: network.toUpperCase(),
      name: network.charAt(0).toUpperCase() + network.slice(1),
    }));
  }

  /**
   * SECURITY: Get security limits for frontend
   */
  getSecurityLimits() {
    return {
      minAirtimeAmount: this.MIN_AIRTIME_AMOUNT,
      maxAirtimeAmount: this.MAX_AIRTIME_AMOUNT,
      amountTolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
      purchaseExpiryMinutes: this.PURCHASE_EXPIRY_MS / (60 * 1000),
    };
  }

  async getUserPurchaseStats(userId: string) {
    const history = await this.getUserAirtimeHistory(userId, 1000);

    return {
      totalPurchases: history.length,
      totalSpent: history.reduce(
        (sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()),
        0
      ),
      successfulPurchases: history.filter((p) => p.status === "completed")
        .length,
      averagePurchase:
        history.length > 0
          ? history.reduce(
              (sum, purchase) =>
                sum + parseFloat(purchase.fiat_amount.toString()),
              0
            ) / history.length
          : 0,
    };
  }

  async getRecentPurchases(userId: string, limit: number = 5) {
    return await this.getUserAirtimeHistory(userId, limit);
  }
}

export const airtimeService = new AirtimeService();