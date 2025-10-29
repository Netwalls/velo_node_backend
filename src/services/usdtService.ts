// import { AppDataSource } from '../config/database';
// import { User } from '../entities/User';
// import { UserAddress } from '../entities/UserAddress';
// import { ChainType, NetworkType } from '../types';
// import { In } from 'typeorm';

// /**
//  * USDTService handles USDT-specific operations including:
//  * - Getting USDT addresses for users
//  * - Fetching USDT balances from blockchain
//  * - Transferring USDT to user addresses
//  */
// export class USDTService {
//     /**
//      * Get user's USDT addresses for all supported networks
//      */
//     static async getUserUSDTAddresses(userId: string): Promise<{
//         erc20: { mainnet: string; testnet: string };
//         trc20: { mainnet: string; testnet: string };
//     }> {
//         try {
//             const addressRepository = AppDataSource.getRepository(UserAddress);

//             const addresses = await addressRepository.find({
//                 where: {
//                     userId,
//                     chain: In([ChainType.USDT_ERC20, ChainType.USDT_TRC20]),
//                 },
//             });

//             const result = {
//                 erc20: { mainnet: '', testnet: '' },
//                 trc20: { mainnet: '', testnet: '' },
//             };

//             addresses.forEach((addr) => {
//                 if (addr.chain === ChainType.USDT_ERC20) {
//                     if (addr.network === NetworkType.MAINNET) {
//                         result.erc20.mainnet = addr.address || '';
//                     } else if (addr.network === NetworkType.TESTNET) {
//                         result.erc20.testnet = addr.address || '';
//                     }
//                 } else if (addr.chain === ChainType.USDT_TRC20) {
//                     if (addr.network === NetworkType.MAINNET) {
//                         result.trc20.mainnet = addr.address || '';
//                     } else if (addr.network === NetworkType.TESTNET) {
//                         result.trc20.testnet = addr.address || '';
//                     }
//                 }
//             });

//             return result;
//         } catch (error) {
//             console.error('Get USDT addresses error:', error);
//             throw new Error('Failed to fetch USDT addresses');
//         }
//     }

//     /**
//      * Get USDT balance from blockchain (all networks combined)
//      * In production, this would query actual blockchain APIs
//      */
//     static async getUSDTBalanceFromBlockchain(userId: string): Promise<{
//         erc20: { mainnet: number; testnet: number };
//         trc20: { mainnet: number; testnet: number };
//         total: number;
//     }> {
//         try {
//             const addresses = await this.getUserUSDTAddresses(userId);

//             // In production, you would call actual blockchain APIs here
//             // For now, returning simulated balances
//             const balances = {
//                 erc20: {
//                     mainnet: await this.getERC20Balance(
//                         addresses.erc20.mainnet,
//                         'mainnet'
//                     ),
//                     testnet: await this.getERC20Balance(
//                         addresses.erc20.testnet,
//                         'testnet'
//                     ),
//                 },
//                 trc20: {
//                     mainnet: await this.getTRC20Balance(
//                         addresses.trc20.mainnet,
//                         'mainnet'
//                     ),
//                     testnet: await this.getTRC20Balance(
//                         addresses.trc20.testnet,
//                         'testnet'
//                     ),
//                 },
//             };

//             const total =
//                 balances.erc20.mainnet +
//                 balances.erc20.testnet +
//                 balances.trc20.mainnet +
//                 balances.trc20.testnet;

//             return { ...balances, total };
//         } catch (error) {
//             console.error('Get USDT blockchain balance error:', error);
//             throw new Error('Failed to fetch USDT balance from blockchain');
//         }
//     }

//     /**
//      * Get ERC-20 USDT balance from Ethereum network
//      * In production, integrate with Ethereum providers like Infura, Alchemy
//      */
//     private static async getERC20Balance(
//         address: string,
//         network: string
//     ): Promise<number> {
//         try {
//             if (!address) return 0;

//             // Placeholder for actual ERC-20 USDT balance query
//             // In production, you would:
//             // 1. Connect to Ethereum provider
//             // 2. Query USDT contract (0xdAC17F958D2ee523a2206206994597C13D831ec7 on mainnet)
//             // 3. Call balanceOf(address) function
//             // 4. Convert from Wei to USDT (6 decimals for USDT)

//             console.log(
//                 `[SIMULATION] Getting ERC-20 USDT balance for ${address} on ${network}`
//             );
//             return 0; // Simulated balance
//         } catch (error) {
//             console.error('ERC-20 balance error:', error);
//             return 0;
//         }
//     }

//     /**
//      * Get TRC-20 USDT balance from Tron network
//      * In production, integrate with Tron providers
//      */
//     private static async getTRC20Balance(
//         address: string,
//         network: string
//     ): Promise<number> {
//         try {
//             if (!address) return 0;

//             // Placeholder for actual TRC-20 USDT balance query
//             // In production, you would:
//             // 1. Connect to Tron provider
//             // 2. Query USDT contract (TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t on mainnet)
//             // 3. Call balanceOf(address) function
//             // 4. Convert from Sun to USDT (6 decimals)

//             console.log(
//                 `[SIMULATION] Getting TRC-20 USDT balance for ${address} on ${network}`
//             );
//             return 0; // Simulated balance
//         } catch (error) {
//             console.error('TRC-20 balance error:', error);
//             return 0;
//         }
//     }

//     /**
//      * Transfer USDT to user's address after conversion
//      * In production, this would execute actual blockchain transactions
//      */
//     static async transferUSDTToUser(
//         userId: string,
//         amount: number,
//         network: 'erc20' | 'trc20' = 'erc20'
//     ): Promise<{
//         success: boolean;
//         txHash?: string;
//         address?: string;
//         amount: number;
//         network: string;
//     }> {
//         try {
//             const addresses = await this.getUserUSDTAddresses(userId);
//             const targetAddress =
//                 network === 'erc20'
//                     ? addresses.erc20.mainnet
//                     : addresses.trc20.mainnet;

//             if (!targetAddress) {
//                 throw new Error(
//                     `No ${network.toUpperCase()} USDT address found for user`
//                 );
//             }

//             // In production, execute actual transfer:
//             // 1. Use hot wallet or exchange API to send USDT
//             // 2. Wait for transaction confirmation
//             // 3. Return actual transaction hash

//             // Simulate transfer
//             const simulatedTxHash = this.generateSimulatedTxHash(network);

//             console.log(
//                 `[SIMULATION] Transferring ${amount} USDT via ${network.toUpperCase()} to ${targetAddress}`
//             );
//             console.log(`[SIMULATION] Transaction hash: ${simulatedTxHash}`);

//             // Update user's database balance
//             await this.updateDatabaseBalance(userId, amount);

//             return {
//                 success: true,
//                 txHash: simulatedTxHash,
//                 address: targetAddress,
//                 amount,
//                 network: network.toUpperCase(),
//             };
//         } catch (error) {
//             console.error('USDT transfer error:', error);
//             return {
//                 success: false,
//                 amount,
//                 network: network.toUpperCase(),
//             };
//         }
//     }

//     /**
//      * Update user's USDT balance in database
//      */
//     private static async updateDatabaseBalance(
//         userId: string,
//         amount: number
//     ): Promise<void> {
//         try {
//             const userRepository = AppDataSource.getRepository(User);
//             const user = await userRepository.findOne({
//                 where: { id: userId },
//             });

//             if (!user) {
//                 throw new Error('User not found');
//             }

//             const currentBalance = Number(user.usdtBalance) || 0;
//             user.usdtBalance = currentBalance + amount;

//             await userRepository.save(user);
//             console.log(
//                 `[DATABASE] Updated USDT balance for user ${userId}: ${user.usdtBalance}`
//             );
//         } catch (error) {
//             console.error('Update database balance error:', error);
//             throw error;
//         }
//     }

//     /**
//      * Generate simulated transaction hash for testing
//      */
//     private static generateSimulatedTxHash(network: string): string {
//         const prefix = network === 'erc20' ? '0x' : '';
//         const randomHex =
//             Math.random().toString(16).substring(2) +
//             Math.random().toString(16).substring(2) +
//             Math.random().toString(16).substring(2);
//         return prefix + randomHex.padEnd(64, '0');
//     }

//     /**
//      * Get primary USDT address for receiving conversions (defaults to ERC-20 mainnet)
//      */
//     static async getPrimaryUSDTAddress(userId: string): Promise<string> {
//         try {
//             const addresses = await this.getUserUSDTAddresses(userId);
//             return addresses.erc20.mainnet || addresses.trc20.mainnet || '';
//         } catch (error) {
//             console.error('Get primary USDT address error:', error);
//             return '';
//         }
//     }
// }
