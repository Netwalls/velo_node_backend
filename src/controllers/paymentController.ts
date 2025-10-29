import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { PriceFeedService } from '../services/priceFeedService';
import NellobytesService from '../services/nellobytesService';
import { ConversionService } from '../services/conversionService';
import { USDTService } from '../services/usdtService';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import ProviderOrder, { ProviderOrderStatus } from '../entities/ProviderOrder';
import TreasuryConfig from '../config/treasury';
import axios from 'axios';

export class CryptoAirtimeController {
	/**
	 * INSTANT PURCHASE - One-click airtime/data purchase using user's wallet balance
	 * POST /api/payments/instant-buy
	 * body: { 
	 *   type: 'airtime' | 'data' | 'cable',
	 *   mobileNetwork: '01' | '02' | '03' | '04',
	 *   amount: number (NGN) OR dataPlan: string,
	 *   mobileNumber: string,
	 *   chain: 'btc' | 'eth' | 'sol' | 'strk' | 'dot' | 'xlm' | 'usdttrc20' | 'usdterc20',
	 * }
	 */
	static async instantBuy(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user?.id;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const { type, mobileNetwork, amount, dataPlan, mobileNumber, chain, decoderID, bouquet, network } = req.body;

			// Validation
			if (!type || !mobileNetwork || !mobileNumber || !chain) {
				res.status(400).json({ 
					error: 'type, mobileNetwork, mobileNumber and chain are required' 
				});
				return;
			}

			// Default to mainnet if not specified
			const selectedNetwork: 'mainnet' | 'testnet' = network === 'testnet' ? 'testnet' : 'mainnet';

			if (type === 'airtime' && !amount) {
				res.status(400).json({ error: 'amount is required for airtime' });
				return;
			}

			if (type === 'data' && !dataPlan) {
				res.status(400).json({ error: 'dataPlan is required for data' });
				return;
			}

			if (type === 'cable' && (!decoderID || !bouquet)) {
				res.status(400).json({ error: 'decoderID and bouquet are required for cable' });
				return;
			}

			// Validate mobile network
			const validNetworks = ['01', '02', '03', '04'];
			if (!validNetworks.includes(mobileNetwork)) {
				res.status(400).json({ 
					error: 'Invalid mobile network. Use 01 (MTN), 02 (GLO), 03 (9mobile), or 04 (Airtel)' 
				});
				return;
			}

			// Get NGN amount for the service
			let amountNGN = 0;
			if (type === 'airtime') {
				amountNGN = Number(amount);
				if (isNaN(amountNGN) || amountNGN < 50 || amountNGN > 200000) {
					res.status(400).json({ 
						error: 'Amount must be between 50 and 200,000 NGN' 
					});
					return;
				}
			} else if (type === 'data') {
				// Get data plan price (you'll need to fetch this from Nellobytes or have a price list)
				amountNGN = await CryptoAirtimeController.getDataPlanPrice(mobileNetwork, dataPlan);
			} else if (type === 'cable') {
				// Get cable plan price
				amountNGN = await CryptoAirtimeController.getCablePlanPrice(mobileNetwork, bouquet);
			}

			// Map chain to token
			const tokenInfo = CryptoAirtimeController.getTokenForChain(chain);
			if (!tokenInfo) {
				res.status(400).json({ 
					error: `Unsupported chain: ${chain}` 
				});
				return;
			}

			// Step 1: Convert NGN to USD
			const usdAmount = await CryptoAirtimeController.convertNGNToUSD(amountNGN);
			if (!usdAmount || usdAmount <= 0) {
				res.status(500).json({ error: 'Failed to convert NGN to USD' });
				return;
			}

			// Step 2: Get token price and calculate required amount
			const tokenPrice = await PriceFeedService.getPrice(tokenInfo.token);
			if (!tokenPrice || tokenPrice <= 0) {
				res.status(400).json({ 
					error: `Failed to fetch price for ${tokenInfo.token}` 
				});
				return;
			}

			const requiredTokenAmount = usdAmount / tokenPrice;

			// Step 3: CHECK USER'S WALLET BALANCE
			// Use the canonical chain name from tokenInfo (e.g. 'solana', 'stellar') so it matches stored UserAddress.chain
			const userBalance = await CryptoAirtimeController.getUserBalance(userId, tokenInfo.token, tokenInfo.chain, selectedNetwork);
			
			if (userBalance < requiredTokenAmount) {
				res.status(400).json({ 
					error: 'Insufficient balance',
					required: requiredTokenAmount,
					available: userBalance,
					token: tokenInfo.token,
					shortfall: requiredTokenAmount - userBalance
				});
				return;
			}

			// Step 4: Create order in database
			const orderRepo = AppDataSource.getRepository(ProviderOrder);
			const requestId = crypto.randomUUID();
            
			const order = orderRepo.create({
				userId,
				requestId,
				mobileNetwork,
				mobileNumber,
				chain: tokenInfo.chain,
				amountNGN,
				token: tokenInfo.token,
				requiredTokenAmount,
				status: ProviderOrderStatus.PROCESSING,
				createdAt: new Date(),
				...(type === 'data' && { dataPlan }),
				...(type === 'cable' && { decoderID, bouquet }),
			});

			await orderRepo.save(order);

			// Step 5: DEDUCT FROM USER'S WALLET
			try {
				await CryptoAirtimeController.deductFromWallet(
					userId,
					tokenInfo.token,
					tokenInfo.chain,
					requiredTokenAmount,
					order.id
				);
			} catch (deductError) {
				order.status = ProviderOrderStatus.FAILED;
				order.providerResponse = { error: 'Failed to deduct from wallet' };
				await orderRepo.save(order);
				
				res.status(500).json({ 
					error: 'Failed to deduct from wallet',
					details: deductError instanceof Error ? deductError.message : 'Unknown error'
				});
				return;
			}

			// Step 6: EXECUTE PROVIDER PURCHASE (Nellobytes)
			try {
				let providerResp;

				if (type === 'airtime') {
					providerResp = await NellobytesService.buyAirtime({
						MobileNetwork: mobileNetwork,
						Amount: amountNGN,
						MobileNumber: mobileNumber,
						RequestID: requestId,
					});
				} else if (type === 'data') {
					providerResp = await NellobytesService.buyDatabundle({
						MobileNetwork: mobileNetwork,
						DataPlan: dataPlan,
						MobileNumber: mobileNumber,
						RequestID: requestId,
					});
				} else if (type === 'cable') {
					providerResp = await NellobytesService.buyCable({
						DecoderID: decoderID,
						Network: mobileNetwork,
						Bouquet: bouquet,
						RequestID: requestId,
					});
				}

				order.providerResponse = providerResp;
				order.status = ProviderOrderStatus.COMPLETED;
				await orderRepo.save(order);

				// Return SUCCESS response immediately
				res.json({
					success: true,
					message: `${type.charAt(0).toUpperCase() + type.slice(1)} purchased successfully! 🎉`,
					order: {
						id: order.id,
						type,
						status: order.status,
						mobileNumber: order.mobileNumber,
						amountNGN: order.amountNGN,
						network: CryptoAirtimeController.getNetworkName(order.mobileNetwork),
						...(type === 'data' && { dataPlan }),
					},
					payment: {
						token: tokenInfo.token,
						amount: requiredTokenAmount,
						usdValue: usdAmount,
						chain: tokenInfo.chain,
						network: selectedNetwork,
					},
					provider: providerResp,
					timestamp: new Date(),
				});

			} catch (providerError) {
				// Provider failed - REFUND the user
				order.status = ProviderOrderStatus.FAILED;
				order.providerResponse = { 
					error: providerError instanceof Error ? providerError.message : 'Provider error' 
				};
				await orderRepo.save(order);

				// Refund to wallet
				try {
					await CryptoAirtimeController.refundToWallet(
						userId,
						tokenInfo.token,
						tokenInfo.chain,
						requiredTokenAmount,
						order.id
					);
				} catch (refundError) {
					console.error('CRITICAL: Failed to refund user', refundError);
					// Log this for manual resolution
				}

				res.status(500).json({ 
					error: 'Purchase failed, amount refunded to your wallet',
					orderId: order.id,
					details: providerError instanceof Error ? providerError.message : 'Unknown error',
				});
			}

		} catch (error) {
			console.error('Instant buy error:', error);
			res.status(500).json({ 
				error: error instanceof Error ? error.message : 'Failed to process purchase' 
			});
		}
	}

	/**
	 * Get user's balance for a specific token/chain/network
	 * Reuses WalletController balance fetching logic to stay DRY
	 * Supports both mainnet and testnet
	 */
	private static async getUserBalance(
		userId: string, 
		token: string, 
		chain: string,
		network: 'mainnet' | 'testnet' = 'mainnet'
	): Promise<number> {
		try {
			const { UserAddress } = await import('../entities/UserAddress');
			const addressRepo = AppDataSource.getRepository(UserAddress);

			// Map chain name to the format stored in UserAddress
			const chainMap: Record<string, string> = {
				'bitcoin': 'bitcoin',
				'ethereum': 'ethereum',
				'solana': 'solana',
				'starknet': 'starknet',
				'stellar': 'stellar',
				'polkadot': 'polkadot',
				'tron': 'usdt_trc20',
			};

			const mappedChain = chainMap[chain.toLowerCase()] || chain.toLowerCase();

			// Find user's address for this chain on specified network
			const userAddress = await addressRepo.findOne({
				where: {
					userId,
					// mappedChain is a string like 'solana'/'stellar' while the entity expects ChainType enum
					// cast to any to satisfy TypeORM/TS here (runtime values match enum string literals)
					chain: mappedChain as any,
					network: network as any,
				},
			});

			if (!userAddress || !userAddress.address) {
				console.log(`[Balance Check] No address found for user ${userId} on ${mappedChain} ${network}`);
				return 0;
			}

			// Import WalletController and reuse its balance fetching logic
			const { WalletController } = await import('./walletController');
			
			// Create a mock request object with just the user info
			const mockReq = {
				user: { id: userId }
			} as any;

			// Create a mock response object to capture the balance data
			let balanceData: any = null;
			const mockRes = {
				status: () => mockRes,
				json: (data: any) => {
					balanceData = data;
					return mockRes;
				}
			} as any;

			// Call appropriate balance method based on network
			if (network === 'mainnet') {
				await WalletController.getMainnetBalances(mockReq, mockRes);
			} else {
				await WalletController.getTestnetBalances(mockReq, mockRes);
			}

			if (!balanceData || !balanceData.balances) {
				console.error(`[Balance Check] Failed to fetch ${network} balances`);
				return 0;
			}

			// Find the balance for our specific chain
			const chainBalance = balanceData.balances.find(
				(b: any) => b.chain === mappedChain && b.network === network
			);

			if (!chainBalance) {
				console.log(`[Balance Check] No balance data found for ${mappedChain} on ${network}`);
				return 0;
			}

			const balance = Number(chainBalance.balance) || 0;
			console.log(`[Balance Check] ${token} balance for user ${userId} on ${network}: ${balance} (chain: ${mappedChain})`);
			
			return balance;
		} catch (error) {
			console.error('Get user balance error:', error);
			return 0;
		}
	}

	/**
	 * Deduct amount from user's wallet
	 */
	private static async deductFromWallet(
		userId: string,
		token: string,
		chain: string,
		amount: number,
		orderId: string
	): Promise<void> {
		// This should integrate with your wallet/balance management system
		// For now, we'll use the ConversionService to record the deduction
		
		try {
			// Create a conversion record showing the spend
			await ConversionService.processManualConversion(
				userId,
				token,
				'NGN', // Converting to service
				amount,
				`internal-deduction-${orderId}`
			);
			
			console.log(`Deducted ${amount} ${token} from user ${userId} for order ${orderId}`);
		} catch (error) {
			console.error('Deduct from wallet error:', error);
			throw new Error('Failed to deduct from wallet');
		}
	}

	/**
	 * Refund amount back to user's wallet
	 */
	private static async refundToWallet(
		userId: string,
		token: string,
		chain: string,
		amount: number,
		orderId: string
	): Promise<void> {
		try {
			// Reverse the deduction by adding back to balance
			await ConversionService.processManualConversion(
				userId,
				'NGN',
				token,
				amount,
				`refund-${orderId}`
			);
			
			console.log(`Refunded ${amount} ${token} to user ${userId} for order ${orderId}`);
		} catch (error) {
			console.error('Refund to wallet error:', error);
			throw new Error('Failed to refund to wallet');
		}
	}

	/**
	 * Get data plan price from Nellobytes or local cache
	 */
	private static async getDataPlanPrice(network: string, dataPlan: string): Promise<number> {
		// TODO: Implement price fetching from Nellobytes API or maintain a price list
		// For now, return a placeholder
		const dataPlanPrices: Record<string, number> = {
			'MTN_1GB': 300,
			'MTN_2GB': 500,
			'GLO_1GB': 250,
			// Add more plans
		};
		
		const key = `${CryptoAirtimeController.getNetworkName(network)}_${dataPlan}`;
		return dataPlanPrices[key] || 500; // Default fallback
	}

	/**
	 * Get cable plan price
	 */
	private static async getCablePlanPrice(network: string, bouquet: string): Promise<number> {
		// TODO: Implement price fetching
		const cablePrices: Record<string, number> = {
			'DSTV_COMPACT': 10500,
			'GOTV_MAX': 4850,
			// Add more plans
		};
		
		return cablePrices[bouquet] || 5000; // Default fallback
	}

	/**
	 * Get order status
	 * GET /api/payments/orders/:orderId
	 */
	static async getOrderStatus(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user?.id;
			const { orderId } = req.params;

			if (!orderId) {
				res.status(400).json({ error: 'orderId required' });
				return;
			}

			const orderRepo = AppDataSource.getRepository(ProviderOrder);
			const order = await orderRepo.findOne({ where: { id: orderId } });

			if (!order) {
				res.status(404).json({ error: 'Order not found' });
				return;
			}

			if (userId && order.userId !== userId) {
				res.status(403).json({ error: 'Unauthorized to view this order' });
				return;
			}

			res.json({
				order: {
					id: order.id,
					requestId: order.requestId,
					status: order.status,
					mobileNetwork: CryptoAirtimeController.getNetworkName(order.mobileNetwork),
					mobileNumber: order.mobileNumber,
					amountNGN: order.amountNGN,
					token: order.token,
					requiredTokenAmount: order.requiredTokenAmount,
					createdAt: order.createdAt,
					providerResponse: order.providerResponse,
				},
			});

		} catch (error) {
			console.error('Get order status error:', error);
			res.status(500).json({ error: 'Failed to fetch order' });
		}
	}

	// Helper methods

	private static getTokenForChain(chain: string): {
		chain: string;
		token: string;
		network: string;
	} | null {
		const chainLower = chain.toLowerCase();
        
		const chainMap: Record<string, { token: string; network: string; chain: string }> = {
			btc: { token: 'BTC', network: 'Bitcoin Mainnet', chain: 'bitcoin' },
			eth: { token: 'ETH', network: 'Ethereum Mainnet', chain: 'ethereum' },
			sol: { token: 'SOL', network: 'Solana Mainnet', chain: 'solana' },
			strk: { token: 'STRK', network: 'Starknet Mainnet', chain: 'starknet' },
			dot: { token: 'DOT', network: 'Polkadot Mainnet', chain: 'polkadot' },
			xlm: { token: 'XLM', network: 'Stellar Mainnet', chain: 'stellar' },
			usdttrc20: { token: 'USDT', network: 'Tron (TRC20)', chain: 'tron' },
			usdterc20: { token: 'USDT', network: 'Ethereum (ERC20)', chain: 'ethereum' },
		};

		return chainMap[chainLower] || null;
	}

	private static async convertNGNToUSD(amountNGN: number): Promise<number> {
		// Method 1: Try exchangerate-api.com (free, no auth needed)
		try {
			const response = await axios.get<{ rates?: Record<string, number> }>(
				`https://open.er-api.com/v6/latest/NGN`,
				{ timeout: 5000 }
			);
			
			if (response.data?.rates?.USD) {
				const rate = Number(response.data.rates.USD);
				return amountNGN * rate;
			}
		} catch (error) {
			console.warn('open.er-api.com failed, trying next method');
		}

		// Method 2: Try exchangerate.host
		try {
			const response = await axios.get<{ result?: number }>(
				`https://api.exchangerate.host/convert?from=NGN&to=USD&amount=${amountNGN}`,
				{ timeout: 5000 }
			);
			
			if (response.data?.result) {
				return Number(response.data.result);
			}
		} catch (error) {
			console.warn('exchangerate.host failed, trying hardcoded rate');
		}

		// Method 3: Fallback to approximate rate (1 USD = ~1,600 NGN as of 2024/2025)
		// Update this periodically or fetch from your own DB
		const FALLBACK_NGN_TO_USD = 1 / 1600; // 1 NGN = 0.000625 USD
		console.warn(`Using fallback NGN->USD rate: ${FALLBACK_NGN_TO_USD}`);
		return amountNGN * FALLBACK_NGN_TO_USD;
	}

	private static getNetworkName(code: string): string {
		const networks: Record<string, string> = {
			'01': 'MTN',
			'02': 'GLO',
			'03': '9mobile',
			'04': 'Airtel',
		};
		return networks[code] || code;
	}
}

/**
 * Backwards-compatible wrapper
 */
export class PaymentController {
	static async getConversionRates(_req: Request, res: Response) {
		try {
			const prices = await PriceFeedService.getAllPrices();
			res.json({ prices });
		} catch (err) {
			console.error('getConversionRates error:', err);
			res.status(500).json({ error: 'Failed to fetch conversion rates' });
		}
	}

	static async getSpecificRate(req: Request, res: Response) {
		try {
			const from = String(req.query.from || '').toUpperCase();
			const to = String(req.query.to || 'USDT').toUpperCase();
			if (!from) {
				res.status(400).json({ error: 'from query parameter required' });
				return;
			}
			const rate = await PriceFeedService.getConversionRate(from, to);
			res.json({ from, to, rate });
		} catch (err) {
			console.error('getSpecificRate error:', err);
			res.status(500).json({ error: 'Failed to fetch rate' });
		}
	}

	static async calculateConversion(req: Request, res: Response) {
		try {
			const { amount, fromCurrency, toCurrency } = req.body;
			if (!amount || !fromCurrency) {
				res.status(400).json({ error: 'amount and fromCurrency are required' });
				return;
			}
			const result = await PriceFeedService.calculateConversion(
				Number(amount),
				String(fromCurrency),
				String(toCurrency || 'USDT')
			);
			res.json(result);
		} catch (err) {
			console.error('calculateConversion error:', err);
			res.status(500).json({ error: 'Failed to calculate conversion' });
		}
	}

	static async convertToUSDT(req: AuthRequest, res: Response) {
		try {
			const userId = req.user?.id;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}
			const { amount, fromCurrency, fromAddress } = req.body;
			if (!amount || !fromCurrency) {
				res.status(400).json({ error: 'amount and fromCurrency are required' });
				return;
			}
			const conversion = await ConversionService.processManualConversion(
				userId,
				String(fromCurrency),
				'USDT',
				Number(amount),
				fromAddress
			);
			res.json({ conversion });
		} catch (err) {
			console.error('convertToUSDT error:', err);
			res.status(500).json({ error: 'Failed to convert' });
		}
	}

	static async getUSDTBalance(req: AuthRequest, res: Response) {
		try {
			const userId = req.user?.id;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}
			const balance = await ConversionService.getUSDTBalance(userId);
			res.json({ balance });
		} catch (err) {
			console.error('getUSDTBalance error:', err);
			res.status(500).json({ error: 'Failed to fetch USDT balance' });
		}
	}

	static async getConversionHistory(req: AuthRequest, res: Response) {
		try {
			const userId = req.user?.id;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}
			const page = Number(req.query.page || 1);
			const limit = Number(req.query.limit || 20);
			const data = await ConversionService.getConversionHistory(userId, page, limit);
			res.json(data);
		} catch (err) {
			console.error('getConversionHistory error:', err);
			res.status(500).json({ error: 'Failed to fetch history' });
		}
	}

	static async cancelConversion(req: AuthRequest, res: Response) {
		try {
			const userId = req.user?.id;
			const { id } = req.params;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}
			await ConversionService.cancelConversion(id, userId);
			res.json({ success: true });
		} catch (err) {
			console.error('cancelConversion error:', err);
			res.status(500).json({ error: 'Failed to cancel conversion' });
		}
	}

	// INSTANT BUY - Main entry point
	static async instantBuy(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.instantBuy(req, res);
	}

	// Nellobytes passthroughs
	static async buyAirtime(req: AuthRequest, res: Response) {
		try {
			const resp = await NellobytesService.buyAirtime(req.body);
			res.json(resp);
		} catch (err) {
			console.error('buyAirtime error:', err);
			res.status(500).json({ error: 'Nellobytes airtime purchase failed' });
		}
	}

	static async buyDatabundle(req: AuthRequest, res: Response) {
		try {
			const resp = await NellobytesService.buyDatabundle(req.body);
			res.json(resp);
		} catch (err) {
			console.error('buyDatabundle error:', err);
			res.status(500).json({ error: 'Nellobytes databundle purchase failed' });
		}
	}

	static async buyCable(req: AuthRequest, res: Response) {
		try {
			const resp = await NellobytesService.buyCable(req.body);
			res.json(resp);
		} catch (err) {
			console.error('buyCable error:', err);
			res.status(500).json({ error: 'Nellobytes cable purchase failed' });
		}
	}

	static async getOrder(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.getOrderStatus(req, res);
	}

	static async queryNellobytes(req: AuthRequest, res: Response) {
		try {
			const { requestId } = req.params;
			const resp = await NellobytesService.queryStatus(requestId);
			res.json(resp);
		} catch (err) {
			console.error('queryNellobytes error:', err);
			res.status(500).json({ error: 'Failed to query Nellobytes' });
		}
	}

	static async cancelNellobytes(req: AuthRequest, res: Response) {
		try {
			const { requestId } = req.params;
			const resp = await NellobytesService.cancel(requestId);
			res.json(resp);
		} catch (err) {
			console.error('cancelNellobytes error:', err);
			res.status(500).json({ error: 'Failed to cancel Nellobytes transaction' });
		}
	}

	static async simulatePaymentDetection(req: Request, res: Response) {
		try {
			const { userId, currency, amount, fromAddress, txHash } = req.body;
			if (!userId || !currency || !amount) {
				res.status(400).json({ error: 'userId, currency and amount are required' });
				return;
			}
			const conv = await ConversionService.processAutomaticConversion(
				String(userId),
				String(currency),
				Number(amount),
				fromAddress || '',
				txHash || ''
			);
			res.json({ success: true, conversionId: conv.id });
		} catch (err) {
			console.error('simulatePaymentDetection error:', err);
			res.status(500).json({ error: 'Failed to simulate payment detection' });
		}
	}

	// Legacy compatibility
	static async createCryptoAirtimeOrder(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.instantBuy(req, res);
	}

	static async attachTxToOrder(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.getOrderStatus(req, res);
	}
}