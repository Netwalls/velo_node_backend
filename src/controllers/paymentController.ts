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
	 * Unified crypto airtime purchase flow
	 * POST /api/payments/airtime/crypto-buy
	 * body: { 
	 *   mobileNetwork: '01' | '02' | '03' | '04',
	 *   amount: number (NGN),
	 *   mobileNumber: string,
	 *   chain: 'btc' | 'eth' | 'sol' | 'strk' | 'dot' | 'xlm' | 'usdttrc20' | 'usdterc20',
	 *   token?: string (optional, defaults to native chain token or USDT)
	 * }
	 */
	static async cryptoBuyAirtime(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user?.id;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const { mobileNetwork, amount, mobileNumber, chain, token } = req.body;

			// Validation
			if (!mobileNetwork || !amount || !mobileNumber || !chain) {
				res.status(400).json({ 
					error: 'mobileNetwork, amount (NGN), mobileNumber and chain are required' 
				});
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

			// Validate amount
			const amountNGN = Number(amount);
			if (isNaN(amountNGN) || amountNGN < 50 || amountNGN > 200000) {
				res.status(400).json({ 
					error: 'Amount must be between 50 and 200,000 NGN' 
				});
				return;
			}

			// Map chain to token
			const tokenInfo = CryptoAirtimeController.getTokenForChain(chain, token);
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

			// Add 2% slippage buffer
			const slippage = 0.02;
			const requiredTokenAmount = (usdAmount / tokenPrice) * (1 + slippage);

			// Step 3: Get treasury address for payment
			const treasuryAddress = CryptoAirtimeController.getTreasuryAddress(
				tokenInfo.chain, 
				tokenInfo.network
			);

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
				status: ProviderOrderStatus.CREATED,
				createdAt: new Date(),
			});

			await orderRepo.save(order);

			// Return payment instructions
			res.json({
				message: 'Order created. Please send crypto to complete purchase.',
				orderId: order.id,
				requestId,
				payment: {
					chain: tokenInfo.chain,
					token: tokenInfo.token,
					amount: requiredTokenAmount,
					address: treasuryAddress,
					network: tokenInfo.network,
				},
				order: {
					mobileNetwork: CryptoAirtimeController.getNetworkName(mobileNetwork),
					mobileNumber,
					amountNGN,
				},
				instructions: [
					`1. Send ${requiredTokenAmount.toFixed(6)} ${tokenInfo.token} to ${treasuryAddress}`,
					`2. Use network: ${tokenInfo.network}`,
					`3. After sending, call POST /api/payments/orders/${order.id}/confirm with your transaction hash`,
				],
			});

		} catch (error) {
			console.error('Crypto buy airtime error:', error);
			res.status(500).json({ 
				error: error instanceof Error ? error.message : 'Failed to create order' 
			});
		}
	}

	/**
	 * Confirm payment and execute purchase
	 * POST /api/payments/orders/:orderId/confirm
	 * body: { txHash: string, tokenAmount: number }
	 */
	static async confirmPayment(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user?.id;
			if (!userId) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const { orderId } = req.params;
			const { txHash, tokenAmount } = req.body;

			if (!txHash || !tokenAmount) {
				res.status(400).json({ 
					error: 'txHash and tokenAmount are required' 
				});
				return;
			}

			// Fetch order
			const orderRepo = AppDataSource.getRepository(ProviderOrder);
			const order = await orderRepo.findOne({ where: { id: orderId } });

			if (!order) {
				res.status(404).json({ error: 'Order not found' });
				return;
			}

			if (order.userId !== userId) {
				res.status(403).json({ error: 'Unauthorized to confirm this order' });
				return;
			}

			if (order.status !== ProviderOrderStatus.CREATED) {
				res.status(400).json({ 
					error: `Order cannot be confirmed in ${order.status} status` 
				});
				return;
			}

			// Verify token amount (with 1% tolerance for rounding)
			const provided = Number(tokenAmount);
			const required = order.requiredTokenAmount;
            
			if (!required) {
				res.status(400).json({ 
					error: 'Order missing required token amount' 
				});
				return;
			}
            
			if (provided < required * 0.99) {
				res.status(400).json({ 
					error: `Insufficient amount. Required: ${required.toFixed(6)} ${order.token}, Provided: ${provided.toFixed(6)} ${order.token}` 
				});
				return;
			}

			// Update order status to PAID
			order.depositTxHash = txHash;
			order.status = ProviderOrderStatus.PAID;
			await orderRepo.save(order);

			// Execute Nellobytes purchase
			order.status = ProviderOrderStatus.PROCESSING;
			await orderRepo.save(order);

			// Validate required fields
			if (!order.mobileNumber || !order.mobileNetwork || !order.amountNGN) {
				order.status = ProviderOrderStatus.FAILED;
				order.providerResponse = { error: 'Missing required order fields' };
				await orderRepo.save(order);
				res.status(400).json({ error: 'Order missing required fields' });
				return;
			}

			try {
				const providerResp = await NellobytesService.buyAirtime({
					MobileNetwork: order.mobileNetwork,
					Amount: order.amountNGN,
					MobileNumber: order.mobileNumber,
					RequestID: order.requestId,
				});

				order.providerResponse = providerResp;
				order.status = ProviderOrderStatus.COMPLETED;
				await orderRepo.save(order);

				res.json({
					message: 'Payment confirmed and airtime purchase completed',
					order: {
						id: order.id,
						status: order.status,
						mobileNumber: order.mobileNumber,
						amountNGN: order.amountNGN,
						network: CryptoAirtimeController.getNetworkName(order.mobileNetwork),
					},
					provider: providerResp,
					transaction: {
						txHash,
						token: order.token,
						amount: provided,
					},
				});

			} catch (providerError) {
				order.status = ProviderOrderStatus.FAILED;
				order.providerResponse = { 
					error: providerError instanceof Error ? providerError.message : 'Provider error' 
				};
				await orderRepo.save(order);

				res.status(500).json({ 
					error: 'Payment confirmed but airtime purchase failed',
					orderId: order.id,
					details: providerError instanceof Error ? providerError.message : 'Unknown error',
				});
			}

		} catch (error) {
			console.error('Confirm payment error:', error);
			res.status(500).json({ 
				error: error instanceof Error ? error.message : 'Failed to confirm payment' 
			});
		}
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

			// Allow viewing order if authenticated or public query
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
					depositTxHash: order.depositTxHash,
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

	private static getTokenForChain(chain: string, customToken?: string): {
		chain: string;
		token: string;
		network: string;
	} | null {
		const chainLower = chain.toLowerCase();
        
		const chainMap: Record<string, { token: string; network: string; chain: string }> = {
			btc: { token: 'BTC', network: 'Bitcoin Mainnet', chain: 'bitcoin' },
			eth: { token: customToken?.toUpperCase() || 'ETH', network: 'Ethereum Mainnet', chain: 'ethereum' },
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
		try {
			// Try exchangerate.host first
			const response = await axios.get<{ result?: number }>(
				`https://api.exchangerate.host/convert?from=NGN&to=USD&amount=${amountNGN}`,
				{ timeout: 5000 }
			);
            
			if (response.data?.result) {
				return Number(response.data.result);
			}
		} catch (error) {
			console.warn('exchangerate.host failed, trying fallback');
		}

		try {
			// Fallback to PriceFeedService
			const calc = await PriceFeedService.calculateConversion(
				amountNGN, 
				'NGN', 
				'USD'
			);
			return calc.outputAmount;
		} catch (error) {
			console.error('All NGN->USD conversion methods failed');
			throw new Error('Currency conversion unavailable');
		}
	}

	private static getTreasuryAddress(chain: string, network: string): string {
		try {
			return TreasuryConfig.getTreasuryWallet(chain, 'mainnet');
		} catch (error) {
			console.error(`Failed to get treasury address for ${chain}:`, error);
			return 'Treasury address not configured';
		}
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
 * Backwards-compatible wrapper used by routes expecting PaymentController.
 * Delegates to existing services and controllers implemented above.
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

	// Crypto-airtime related wrappers
	static async createCryptoAirtimeOrder(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.cryptoBuyAirtime(req, res);
	}

	static async attachTxToOrder(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.confirmPayment(req, res);
	}

	static async getOrder(req: AuthRequest, res: Response) {
		return CryptoAirtimeController.getOrderStatus(req, res);
	}

	// Nellobytes query/cancel
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

	/**
	 * Simulate payment detection webhook.
	 * Body: { userId, currency, amount, fromAddress, txHash }
	 */
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
}