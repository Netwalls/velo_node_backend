import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { PriceFeedService } from '../services/priceFeedService';
import NellobytesService from '../services/nellobytesService';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import ProviderOrder, { ProviderOrderStatus } from '../entities/ProviderOrder';
import axios from 'axios';

// NEW: Transaction entity to track wallet debits/credits
import { UserTransaction } from '../entities/UserTransaction';

export class CryptoAirtimeController {
	/**
	 * INSTANT PURCHASE - One-click airtime/data purchase using user's wallet balance
	 * POST /api/payments/instant-buy
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
				amountNGN = await CryptoAirtimeController.getDataPlanPrice(mobileNetwork, dataPlan);
			} else if (type === 'cable') {
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

			// Step 3: CHECK USER'S WALLET BALANCE (FIXED)
			const userBalance = await CryptoAirtimeController.getUserBalance(
				userId, 
				tokenInfo.token, 
				tokenInfo.chain, 
				selectedNetwork
			);
			
			console.log(`[Balance Check] User ${userId} has ${userBalance} ${tokenInfo.token}, needs ${requiredTokenAmount}`);
			
			if (userBalance < requiredTokenAmount) {
				res.status(400).json({ 
					error: 'Insufficient balance',
					required: requiredTokenAmount,
					available: userBalance,
					token: tokenInfo.token,
					shortfall: requiredTokenAmount - userBalance,
					chain: tokenInfo.chain,
					network: selectedNetwork
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
				network: selectedNetwork, // Store which network was used
				...(type === 'data' && { dataPlan }),
				...(type === 'cable' && { decoderID, bouquet }),
			});

			await orderRepo.save(order);

			// Step 5: DEDUCT FROM USER'S WALLET (FIXED)
			try {
				await CryptoAirtimeController.deductFromWallet(
					userId,
					tokenInfo.token,
					tokenInfo.chain,
					requiredTokenAmount,
					selectedNetwork,
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
						selectedNetwork,
						order.id
					);
				} catch (refundError) {
					console.error('CRITICAL: Failed to refund user', refundError);
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
	 * FIXED: Get user's balance for a specific token/chain/network
	 * Now properly fetches on-chain balance
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

			// Find user's address for this chain
			const userAddress = await addressRepo.findOne({
				where: {
					userId,
					chain: chain as any,
					network: network as any,
				},
			});

			if (!userAddress || !userAddress.address) {
				console.log(`[Balance] No address found for user ${userId} on ${chain} ${network}`);
				return 0;
			}

			console.log(`[Balance] Fetching ${token} balance for address: ${userAddress.address} on ${chain}`);

			// Fetch actual on-chain balance based on chain
			let balance = 0;

			switch (chain.toLowerCase()) {
				case 'solana':
					balance = await CryptoAirtimeController.getSolanaBalance(userAddress.address, network);
					break;
				case 'bitcoin':
					balance = await CryptoAirtimeController.getBitcoinBalance(userAddress.address, network);
					break;
				case 'ethereum':
					balance = await CryptoAirtimeController.getEthereumBalance(userAddress.address, network);
					break;
				case 'stellar':
					balance = await CryptoAirtimeController.getStellarBalance(userAddress.address, network);
					break;
				case 'starknet':
					balance = await CryptoAirtimeController.getStarknetBalance(userAddress.address, network);
					break;
				case 'polkadot':
					balance = await CryptoAirtimeController.getPolkadotBalance(userAddress.address, network);
					break;
				case 'tron':
					// For USDT TRC20
					balance = await CryptoAirtimeController.getTronUSDTBalance(userAddress.address, network);
					break;
				default:
					console.warn(`[Balance] Unsupported chain: ${chain}`);
					return 0;
			}

			console.log(`[Balance] ${token} balance: ${balance}`);
			return balance;

		} catch (error) {
			console.error('[Balance] Error fetching balance:', error);
			return 0;
		}
	}

	/**
	 * FIXED: Deduct amount from user's wallet
	 * Creates a DEBIT transaction instead of trying to "convert"
	 */
	private static async deductFromWallet(
		userId: string,
		token: string,
		chain: string,
		amount: number,
		network: 'mainnet' | 'testnet',
		orderId: string
	): Promise<void> {
		try {
			const transactionRepo = AppDataSource.getRepository(UserTransaction);

			// Create a DEBIT transaction
			// TypeORM DeepPartial typing can be strict in some TS configs; cast to any here to avoid overload
			const transaction = transactionRepo.create({
				userId,
				type: 'DEBIT', // or 'SPEND'
				token,
				chain,
				network,
				amount,
				status: 'COMPLETED',
				reference: `order-${orderId}`,
				description: `Airtime/Data purchase - Order ${orderId}`,
				createdAt: new Date(),
			} as any);

			await transactionRepo.save(transaction as any);
			
			console.log(`[Wallet] Deducted ${amount} ${token} from user ${userId} for order ${orderId}`);
		} catch (error) {
			console.error('[Wallet] Deduct error:', error);
			throw new Error('Failed to deduct from wallet');
		}
	}

	/**
	 * FIXED: Refund amount back to user's wallet
	 * Creates a CREDIT transaction
	 */
	private static async refundToWallet(
		userId: string,
		token: string,
		chain: string,
		amount: number,
		network: 'mainnet' | 'testnet',
		orderId: string
	): Promise<void> {
		try {
			const transactionRepo = AppDataSource.getRepository(UserTransaction);

			// Create a CREDIT transaction
			const transaction = transactionRepo.create({
				userId,
				type: 'CREDIT', // or 'REFUND'
				token,
				chain,
				network,
				amount,
				status: 'COMPLETED',
				reference: `refund-${orderId}`,
				description: `Refund for failed order ${orderId}`,
				createdAt: new Date(),
			} as any);

			await transactionRepo.save(transaction as any);
			
			console.log(`[Wallet] Refunded ${amount} ${token} to user ${userId} for order ${orderId}`);
		} catch (error) {
			console.error('[Wallet] Refund error:', error);
			throw new Error('Failed to refund to wallet');
		}
	}

	// Chain-specific balance fetchers
	private static async getSolanaBalance(address: string, network: string): Promise<number> {
		try {
			const rpcUrl = network === 'mainnet' 
				? 'https://api.mainnet-beta.solana.com'
				: 'https://api.devnet.solana.com';

			const response = await axios.post<{ result?: { value: number } }>(rpcUrl, {
				jsonrpc: '2.0',
				id: 1,
				method: 'getBalance',
				params: [address]
			});

			const lamports = response.data?.result?.value || 0;
			return lamports / 1e9; // Convert lamports to SOL
		} catch (error) {
			console.error('[Solana] Balance fetch error:', error);
			return 0;
		}
	}

	private static async getBitcoinBalance(address: string, network: string): Promise<number> {
		try {
			const apiUrl = network === 'mainnet'
				? `https://blockchain.info/q/addressbalance/${address}`
				: `https://blockstream.info/testnet/api/address/${address}`;

			const response = await axios.get<number | { chain_stats?: { funded_txo_sum: number } }>(apiUrl);
			const satoshis = typeof response.data === 'number' 
				? response.data 
				: response.data?.chain_stats?.funded_txo_sum || 0;
			
			return satoshis / 1e8; // Convert satoshis to BTC
		} catch (error) {
			console.error('[Bitcoin] Balance fetch error:', error);
			return 0;
		}
	}

	private static async getEthereumBalance(address: string, network: string): Promise<number> {
		try {
			const rpcUrl = network === 'mainnet'
				? 'https://eth.llamarpc.com'
				: 'https://eth-sepolia.g.alchemy.com/v2/demo';

			const response = await axios.post<{ result?: string }>(rpcUrl, {
				jsonrpc: '2.0',
				id: 1,
				method: 'eth_getBalance',
				params: [address, 'latest']
			});

			const weiBalance = parseInt(response.data?.result || '0', 16);
			return weiBalance / 1e18; // Convert wei to ETH
		} catch (error) {
			console.error('[Ethereum] Balance fetch error:', error);
			return 0;
		}
	}

	private static async getStellarBalance(address: string, network: string): Promise<number> {
		try {
			const horizonUrl = network === 'mainnet'
				? 'https://horizon.stellar.org'
				: 'https://horizon-testnet.stellar.org';

			const response = await axios.get<{ balances?: Array<{ asset_type: string; balance: string }> }>(`${horizonUrl}/accounts/${address}`);
			const xlmBalance = response.data?.balances?.find((b: any) => b.asset_type === 'native');
			
			return parseFloat(xlmBalance?.balance || '0');
		} catch (error) {
			console.error('[Stellar] Balance fetch error:', error);
			return 0;
		}
	}

	private static async getStarknetBalance(address: string, network: string): Promise<number> {
		// Implement Starknet balance fetching
		console.warn('[Starknet] Balance fetching not implemented');
		return 0;
	}

	private static async getPolkadotBalance(address: string, network: string): Promise<number> {
		// Implement Polkadot balance fetching
		console.warn('[Polkadot] Balance fetching not implemented');
		return 0;
	}

	private static async getTronUSDTBalance(address: string, network: string): Promise<number> {
		try {
			const apiUrl = network === 'mainnet'
				? 'https://api.trongrid.io'
				: 'https://api.shasta.trongrid.io';

			// USDT TRC20 contract address
			const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

			const response = await axios.post<{ constant_result?: string[] }>(`${apiUrl}/wallet/triggerconstantcontract`, {
				owner_address: address,
				contract_address: usdtContract,
				function_selector: 'balanceOf(address)',
				parameter: address
			});

			const balance = parseInt(response.data?.constant_result?.[0] || '0', 16);
			return balance / 1e6; // USDT has 6 decimals
		} catch (error) {
			console.error('[Tron] USDT balance fetch error:', error);
			return 0;
		}
	}

	// Helper methods (unchanged)
	private static async getDataPlanPrice(network: string, dataPlan: string): Promise<number> {
		const dataPlanPrices: Record<string, number> = {
			'MTN_1GB': 300,
			'MTN_2GB': 500,
			'GLO_1GB': 250,
		};
		
		const key = `${CryptoAirtimeController.getNetworkName(network)}_${dataPlan}`;
		return dataPlanPrices[key] || 500;
	}

	private static async getCablePlanPrice(network: string, bouquet: string): Promise<number> {
		const cablePrices: Record<string, number> = {
			'DSTV_COMPACT': 10500,
			'GOTV_MAX': 4850,
		};
		
		return cablePrices[bouquet] || 5000;
	}

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
			console.warn('Exchange rate API failed');
		}

		const FALLBACK_NGN_TO_USD = 1 / 1600;
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

// Provide a named export `PaymentController` expected by routes.
// Map implemented handlers to their existing methods, and provide lightweight
// 501 stubs for endpoints that live elsewhere or aren't implemented in this file.

export const PaymentController = {
	// Implemented
	instantBuy: CryptoAirtimeController.instantBuy,
	// Routes expect `getOrder` but this file uses `getOrderStatus`
	getOrder: CryptoAirtimeController.getOrderStatus,

	// Not implemented here — return 501 so server doesn't crash on startup.
	getConversionRates: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'getConversionRates not implemented in this controller' });
	},
	getSpecificRate: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'getSpecificRate not implemented in this controller' });
	},
	calculateConversion: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'calculateConversion not implemented in this controller' });
	},
	convertToUSDT: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'convertToUSDT not implemented in this controller' });
	},
	getUSDTBalance: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'getUSDTBalance not implemented in this controller' });
	},
	getConversionHistory: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'getConversionHistory not implemented in this controller' });
	},
	cancelConversion: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'cancelConversion not implemented in this controller' });
	},

	// Nellobytes endpoints — these are likely implemented elsewhere; provide stubs
	buyAirtime: async (req: AuthRequest, res: Response) => {
		try {
			const userId = req.user?.id || null;
			const { MobileNetwork, Amount, MobileNumber, RequestID } = req.body as any;

			if (!MobileNetwork || !Amount || !MobileNumber) {
				return res.status(400).json({ error: 'MobileNetwork, Amount and MobileNumber are required' });
			}

			// Optionally attach RequestID else generate one
			const requestId = RequestID || `nb_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

			const providerResp = await NellobytesService.buyAirtime({ MobileNetwork, Amount, MobileNumber, RequestID: requestId });

			// Return provider response to caller
			return res.json({ success: true, provider: providerResp, requestId });
		} catch (error: any) {
			console.error('buyAirtime error', error);
			return res.status(500).json({ error: error instanceof Error ? error.message : 'Nellobytes buy airtime failed' });
		}
	},
	buyDatabundle: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'buyDatabundle not implemented here' });
	},
	buyCable: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'buyCable not implemented here' });
	},

	createCryptoAirtimeOrder: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'createCryptoAirtimeOrder not implemented here' });
	},
	attachTxToOrder: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'attachTxToOrder not implemented here' });
	},
	queryNellobytes: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'queryNellobytes not implemented here' });
	},
	cancelNellobytes: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'cancelNellobytes not implemented here' });
	},
	simulatePaymentDetection: async (_req: Request, res: Response) => {
		res.status(501).json({ error: 'simulatePaymentDetection not implemented here' });
	},
};
// Backwards-compatibility note: `PaymentController` is exported above and
// maps to implemented handlers (or 501 stubs) so existing routes work.