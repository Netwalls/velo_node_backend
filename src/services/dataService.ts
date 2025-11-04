// src/services/dataService.ts
import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import {
  DataPurchase,
  DataPurchaseStatus,
  MobileNetwork,
  Blockchain,
} from "../entities/DataPurchase";
import nellobytesService, { 
  isSuccessfulResponse, 
  parsePriceString,
  NellobytesDataPlan 
} from "./nellobytesService";
import { blockchainValidator } from "./blockchain/validators";
import { exchangeRateService } from "./exchangeRateService";

export class DataService {
  private dataPurchaseRepo: Repository<DataPurchase>;

  // Security constants
  private readonly MIN_DATA_AMOUNT = 50;
  private readonly MAX_DATA_AMOUNT = 200000;
  private readonly AMOUNT_TOLERANCE_PERCENT = 1.0; // 1% tolerance
  private readonly PURCHASE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  // Data plans cache
  private dataPlansCache: { [key in MobileNetwork]?: NellobytesDataPlan[] } = {};
  private plansCacheTimestamp: number = 0;
  private readonly CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

  constructor() {
    this.dataPurchaseRepo = null as any;
  }

  private getRepository(): Repository<DataPurchase> {
    if (!this.dataPurchaseRepo) {
      this.dataPurchaseRepo = AppDataSource.getRepository(DataPurchase);
    }
    return this.dataPurchaseRepo;
  }

  /**
   * Fetch and cache data plans from Nellobytes API
   */
  private async refreshDataPlans(): Promise<void> {
    const now = Date.now();
    
    // Check if cache is still valid
    if (this.plansCacheTimestamp && (now - this.plansCacheTimestamp) < this.CACHE_DURATION_MS) {
      console.log('📋 Using cached data plans');
      return;
    }

    try {
      console.log('📋 Fetching fresh data plans from Nellobytes API...');
      
      // Fetch all plans
      const allPlans = await nellobytesService.fetchDataPlans();
      
      // Group plans by network
      this.dataPlansCache = {
        [MobileNetwork.MTN]: allPlans.filter(p => p.plan_network === '01'),
        [MobileNetwork.GLO]: allPlans.filter(p => p.plan_network === '02'),
        [MobileNetwork.ETISALAT]: allPlans.filter(p => p.plan_network === '03'),
        [MobileNetwork.AIRTEL]: allPlans.filter(p => p.plan_network === '04'),
      };

      this.plansCacheTimestamp = now;
      
      console.log('✅ Data plans cached successfully:', {
        mtn: this.dataPlansCache[MobileNetwork.MTN]?.length || 0,
        glo: this.dataPlansCache[MobileNetwork.GLO]?.length || 0,
        '9mobile': this.dataPlansCache[MobileNetwork.ETISALAT]?.length || 0,
        airtel: this.dataPlansCache[MobileNetwork.AIRTEL]?.length || 0,
      });

    } catch (error: any) {
      console.error('❌ Failed to fetch data plans:', error.message);
      
      // If cache is empty, throw error. Otherwise, use stale cache
      if (Object.keys(this.dataPlansCache).length === 0) {
        throw new Error('Failed to load data plans. Please try again later.');
      }
      
      console.warn('⚠️ Using stale cache due to API error');
    }
  }

  /**
   * SECURE: Process data purchase with comprehensive validation
   */
  async processDataPurchase(
    userId: string,
    purchaseData: {
      type: "data";
      dataplanId: string;
      amount: number;  // Amount user is paying (for blockchain validation)
      chain: Blockchain;
      phoneNumber: string;
      mobileNetwork: MobileNetwork;
      transactionHash: string;
    }
  ) {
    console.log(`📄 Processing data purchase for user ${userId}:`, purchaseData);

    let dataPurchase: DataPurchase | null = null;

    try {
      // 1. Refresh data plans cache if needed
      await this.refreshDataPlans();

      // 2. Get and validate the selected data plan
      const plan = await this.getDataPlanById(purchaseData.mobileNetwork, purchaseData.dataplanId);
      if (!plan) {
        throw new Error(`Invalid data plan selected: ${purchaseData.dataplanId}`);
      }

      console.log(`📱 Selected plan: ${plan.plan_name} - ${plan.plan_amount}`);

      // 3. Parse the plan amount from Nellobytes
      const planAmount = parsePriceString(plan.plan_amount);
      console.log(`💰 Plan price: ₦${planAmount}`);

      // 4. Validate that user's amount matches plan amount
      if (Math.abs(purchaseData.amount - planAmount) > 0.01) {
        throw new Error(
          `Amount mismatch: Expected ₦${planAmount} for selected plan, but received ₦${purchaseData.amount}`
        );
      }

      // 5. Comprehensive input validation
      this.validatePurchaseData(purchaseData, planAmount);

      // 6. Check transaction hash uniqueness
      await this.checkTransactionHashUniqueness(purchaseData.transactionHash);

      // 7. Convert fiat amount to crypto amount (using user's amount)
      const expectedCryptoAmount = await this.convertFiatToCrypto(
        purchaseData.amount,
        purchaseData.chain
      );

      // 8. Get the company's wallet address
      const receivingWallet = this.getBlockchainWallet(purchaseData.chain);

      console.log(`💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`);

      // 9. Create pending purchase record
      dataPurchase = new DataPurchase();
      dataPurchase.user_id = userId;
      dataPurchase.network = purchaseData.mobileNetwork;
      dataPurchase.blockchain = purchaseData.chain;
      dataPurchase.crypto_amount = expectedCryptoAmount;
      dataPurchase.crypto_currency = purchaseData.chain.toUpperCase();
      dataPurchase.fiat_amount = purchaseData.amount;
      dataPurchase.phone_number = purchaseData.phoneNumber;
      dataPurchase.transaction_hash = purchaseData.transactionHash;
      dataPurchase.status = DataPurchaseStatus.PROCESSING;
      dataPurchase.plan_name = plan.plan_name;
      dataPurchase.dataplan_id = plan.dataplan_id;

      await this.getRepository().save(dataPurchase);

      // 10. Validate the blockchain transaction with amount tolerance
      console.log(`🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`);

      const isValid = await this.validateBlockchainTransaction(
        purchaseData.chain,
        purchaseData.transactionHash,
        expectedCryptoAmount,
        receivingWallet
      );

      if (!isValid) {
        await this.markPurchaseFailed(dataPurchase, "Transaction validation failed");
        throw new Error("Transaction validation failed. Please check the transaction details.");
      }

      console.log(`✅ Transaction validated! Proceeding to data delivery...`);

      // 11. Process data with Nellobytesystems (NO AMOUNT, just dataplan_id)
      const providerResult = await this.processDataWithNellobytes(dataPurchase);

      // 12. Mark as completed ONLY if provider succeeded
      dataPurchase.status = DataPurchaseStatus.COMPLETED;
      dataPurchase.provider_reference = providerResult.orderid;
      dataPurchase.metadata = {
        providerResponse: providerResult,
        processedAt: new Date().toISOString(),
        planDetails: {
          name: plan.plan_name,
          amount: plan.plan_amount,
          validity: plan.month_validate,
        },
        security: {
          validatedAt: new Date().toISOString(),
          amountTolerance: this.AMOUNT_TOLERANCE_PERCENT,
        },
      };
      await this.getRepository().save(dataPurchase);

      console.log(`🎉 Data delivered! ${plan.plan_name} to ${purchaseData.phoneNumber}`);

      return {
        success: true,
        message: `Data purchase successful! ${plan.plan_name} delivered to ${purchaseData.phoneNumber}`,
        data: {
          purchaseId: dataPurchase.id,
          planName: plan.plan_name,
          planAmount: plan.plan_amount,
          validity: plan.month_validate,
          network: purchaseData.mobileNetwork,
          phoneNumber: purchaseData.phoneNumber,
          providerReference: providerResult.orderid,
          cryptoAmount: expectedCryptoAmount,
          cryptoCurrency: purchaseData.chain.toUpperCase(),
          deliveredAt: new Date(),
        },
      };
    } catch (error: any) {
      console.error("❌ Data purchase failed:", error);

      // If we created a purchase record but failed later, update its status
      if (dataPurchase && dataPurchase.id) {
        await this.markPurchaseFailed(dataPurchase, error.message);

        // Initiate refund for blockchain-validated but provider-failed transactions
        if (dataPurchase.status === DataPurchaseStatus.PROCESSING) {
          await this.initiateRefund(dataPurchase, error.message);
        }
      }

      throw error;
    }
  }

  /**
   * Process data with Nellobytesystems with proper error handling
   * NOTE: We send dataplan_id, NOT amount
   */
  private async processDataWithNellobytes(purchase: DataPurchase) {
    try {
      console.log(`📞 Calling Nellobytes API for ${purchase.plan_name} to ${purchase.phone_number}`);

      const providerResult = await nellobytesService.purchaseDataBundle(
        purchase.network,
        purchase.dataplan_id,  // Send dataplan_id, not amount
        purchase.phone_number,
        `VELO_DATA_${purchase.id}_${Date.now()}`
      );

      console.log(`📞 Nellobytes API response:`, providerResult);

      // ✅ CHECK FOR SUCCESS
      if (isSuccessfulResponse(providerResult) || providerResult.status === 'ORDER_RECEIVED') {
        console.log(`✅ Nellobytes order successful: ${providerResult.orderid}`);
        return providerResult;
      } else {
        const errorMessage = this.mapNellobytesError(providerResult.statuscode, providerResult.status);
        console.error(`❌ Nellobytes API error: ${providerResult.statuscode} - ${providerResult.status}`);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error(`❌ Nellobytes API call failed:`, error.message);

      if (error.message.includes('Nellobytes:')) {
        throw error;
      }

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
      'INVALID_PRODUCT_CODE': 'Nellobytes: Invalid data plan selected.',
      'INVALID_DATAPLAN': 'Nellobytes: Invalid data plan selected.',
      'INVALID_RECIPIENT': 'Nellobytes: Invalid phone number format.',
      'SERVICE_TEMPORARILY_UNAVAIALBLE': 'Nellobytes: Service temporarily unavailable. Please try again later.',
      'INSUFFICIENT_APIBALANCE': 'Nellobytes: Insufficient provider balance. Please try again later.',
    };

    if (errorMap[status]) {
      return errorMap[status];
    }

    if (statusCode !== '100' && statusCode !== '200') {
      return `Nellobytes: Service error (Code: ${statusCode}) - ${status}`;
    }

    return `Nellobytes: ${status}`;
  }

  /**
   * Initiate refund when data delivery fails
   */
  private async initiateRefund(purchase: DataPurchase, reason: string) {
    try {
      console.log(`💸 Initiating refund for purchase ${purchase.id}: ${reason}`);

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
    }
  }

  /**
   * Get data plan by ID
   */
  private async getDataPlanById(network: MobileNetwork, dataplanId: string): Promise<NellobytesDataPlan | null> {
    await this.refreshDataPlans();
    
    const plans = this.dataPlansCache[network];
    if (!plans) return null;

    return plans.find(plan => plan.dataplan_id === dataplanId) || null;
  }

  /**
   * SECURITY: Comprehensive input validation
   */
  private validatePurchaseData(purchaseData: any, planAmount: number) {
    const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = purchaseData;

    // Type validation
    if (type !== "data") {
      throw new Error("Invalid purchase type");
    }

    // Amount validation
    if (typeof amount !== "number" || isNaN(amount)) {
      throw new Error("Amount must be a valid number");
    }

    if (amount < this.MIN_DATA_AMOUNT) {
      throw new Error(`Minimum data amount is ${this.MIN_DATA_AMOUNT} NGN`);
    }

    if (amount > this.MAX_DATA_AMOUNT) {
      throw new Error(`Maximum data amount is ${this.MAX_DATA_AMOUNT} NGN`);
    }

    // Phone number validation (Nigeria)
    const phoneRegex = /^234[7-9][0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error("Invalid Nigerian phone number format. Use 234XXXXXXXXXX");
    }

    // Network validation
    if (!Object.values(MobileNetwork).includes(mobileNetwork)) {
      throw new Error(`Invalid mobile network. Supported: ${Object.values(MobileNetwork).join(", ")}`);
    }

    // Blockchain validation
    if (!Object.values(Blockchain).includes(chain)) {
      throw new Error(`Unsupported blockchain. Supported: ${Object.values(Blockchain).join(", ")}`);
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
  private async checkTransactionHashUniqueness(transactionHash: string): Promise<void> {
    const existingPurchase = await this.getRepository().findOne({
      where: { transaction_hash: transactionHash },
    });

    if (existingPurchase) {
      this.logSecurityEvent("DUPLICATE_TRANSACTION_HASH", { transactionHash });
      throw new Error("This transaction has already been used for another purchase");
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
    const tolerance = expectedAmount * (this.AMOUNT_TOLERANCE_PERCENT / 100);
    const minAllowedAmount = expectedAmount - tolerance;
    const maxAllowedAmount = expectedAmount + tolerance;

    console.log(`   Amount range: ${minAllowedAmount} - ${maxAllowedAmount} ${blockchain}`);

    try {
      switch (blockchain) {
        case Blockchain.ETHEREUM:
          return await blockchainValidator.validateEthereumTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        case Blockchain.BITCOIN:
          return await blockchainValidator.validateBitcoinTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        case Blockchain.SOLANA:
          return await blockchainValidator.validateSolanaTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        case Blockchain.STELLAR:
          return await blockchainValidator.validateStellarTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        case Blockchain.POLKADOT:
          return await blockchainValidator.validatePolkadotTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        case Blockchain.STARKNET:
          return await blockchainValidator.validateStarknetTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        case Blockchain.USDT_ERC20:
          return await blockchainValidator.validateUsdtTransaction(
            transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount
          );
        default:
          return false;
      }
    } catch (error) {
      console.error(`Blockchain validation error:`, error);
      return false;
    }
  }

  /**
   * SECURITY: Mark purchase as failed
   */
  private async markPurchaseFailed(purchase: DataPurchase, reason: string) {
    purchase.status = DataPurchaseStatus.FAILED;
    purchase.metadata = {
      ...purchase.metadata,
      error: reason,
      failedAt: new Date().toISOString(),
    };
    await this.getRepository().save(purchase);

    this.logSecurityEvent("PURCHASE_FAILED", {
      purchaseId: purchase.id,
      reason,
      userId: purchase.user_id,
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
      service: "DataService",
    });
  }

  /**
   * Get company's wallet address
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
   * Convert fiat to crypto
   */
  private async convertFiatToCrypto(fiatAmount: number, blockchain: Blockchain): Promise<number> {
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
      const cryptoAmount = await exchangeRateService.convertFiatToCrypto(fiatAmount, cryptoId);

      console.log(`💰 Exchange rate: ${fiatAmount} NGN = ${cryptoAmount} ${cryptoId.toUpperCase()}`);
      return cryptoAmount;
    } catch (error: any) {
      console.error("❌ Exchange rate failed:", error.message);
      return this.getMockCryptoAmount(fiatAmount, blockchain);
    }
  }

  private getMockCryptoAmount(fiatAmount: number, blockchain: Blockchain): number {
    const mockRates: { [key in Blockchain]: number } = {
      [Blockchain.ETHEREUM]: 2000000,
      [Blockchain.BITCOIN]: 60000000,
      [Blockchain.SOLANA]: 269800,
      [Blockchain.STELLAR]: 500,
      [Blockchain.POLKADOT]: 10000,
      [Blockchain.STARKNET]: 2000,
      [Blockchain.USDT_ERC20]: 1500,
    };

    const cryptoAmount = fiatAmount / mockRates[blockchain];
    return Math.round(cryptoAmount * 100000000) / 100000000;
  }

  /**
   * Get available data plans for a network (from cache or API)
   */
  async getDataPlans(network: MobileNetwork): Promise<NellobytesDataPlan[]> {
    await this.refreshDataPlans();
    return this.dataPlansCache[network] || [];
  }

  /**
   * Force refresh data plans from API
   */
  async forceRefreshDataPlans(): Promise<void> {
    this.plansCacheTimestamp = 0; // Invalidate cache
    await this.refreshDataPlans();
  }

  /**
   * Get user's data purchase history
   */
  async getUserDataHistory(userId: string, limit: number = 10) {
    return await this.getRepository().find({
      where: { user_id: userId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  /**
   * Get expected crypto amount for a data plan
   */
  async getExpectedCryptoAmount(dataplanId: string, network: MobileNetwork, chain: Blockchain) {
    const plan = await this.getDataPlanById(network, dataplanId);
    
    if (!plan) {
      throw new Error('Invalid data plan selected');
    }

    const planAmount = parsePriceString(plan.plan_amount);
    const cryptoAmount = await this.convertFiatToCrypto(planAmount, chain);

    return {
      cryptoAmount,
      cryptoCurrency: chain.toUpperCase(),
      fiatAmount: planAmount,
      chain,
      planDetails: {
        id: plan.dataplan_id,
        name: plan.plan_name,
        amount: plan.plan_amount,
        validity: plan.month_validate,
      },
      tolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
      instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} to complete the data purchase`,
    };
  }

  getSupportedBlockchains() {
    return Object.values(Blockchain).map((chain) => ({
      chain: chain,
      symbol: chain.toUpperCase(),
      name: chain.charAt(0).toUpperCase() + chain.slice(1).replace("_", " "),
    }));
  }

  getSupportedNetworks() {
    return Object.values(MobileNetwork).map((network) => ({
      value: network,
      label: network.toUpperCase(),
      name: network.charAt(0).toUpperCase() + network.slice(1),
    }));
  }

  getSecurityLimits() {
    return {
      minDataAmount: this.MIN_DATA_AMOUNT,
      maxDataAmount: this.MAX_DATA_AMOUNT,
      amountTolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
      purchaseExpiryMinutes: this.PURCHASE_EXPIRY_MS / (60 * 1000),
    };
  }

  async getUserPurchaseStats(userId: string) {
    const history = await this.getUserDataHistory(userId, 1000);

    return {
      totalPurchases: history.length,
      totalSpent: history.reduce(
        (sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()),
        0
      ),
      successfulPurchases: history.filter((p) => p.status === DataPurchaseStatus.COMPLETED).length,
      averagePurchase:
        history.length > 0
          ? history.reduce(
              (sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()),
              0
            ) / history.length
          : 0,
    };
  }
}

export const dataService = new DataService();