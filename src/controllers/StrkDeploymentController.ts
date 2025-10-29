import { Transaction } from '../entities/Transaction';
import { Request, Response } from 'express';
import { UserAddress } from '../entities/UserAddress';
import { AuthRequest, NetworkType } from '../types';
import { RpcProvider, Account, ec, uint256 } from 'starknet';
import { ethers } from 'ethers';
import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction as SolTx,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);
import axios from 'axios';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { AppDataSource } from '../config/database';
import { decrypt } from '../utils/keygen';
import { deployStrkWallet, checkBalance } from '../utils/keygen';

// ... [rest of your existing code before getTestnetBalances]

export class StrkController {
    // ... [all your existing methods]

    /**
     * Get testnet balances for the authenticated user
     * Returns balances for all testnet addresses only
     * Also checks and deploys Starknet accounts if they have sufficient funds
     */
    static async getTestnetBalancesDeploy(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const addressRepo = AppDataSource.getRepository(UserAddress);
            const addresses = await addressRepo.find({
                where: {
                    userId: req.user!.id,
                    network: NetworkType.TESTNET,
                },
            });

            const balances: any[] = [];

            // Loop through each testnet address and fetch balance
            for (const addr of addresses) {
                if (addr.chain === 'starknet') {
                    try {
                        const provider = new RpcProvider({
                            nodeUrl:
                                `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`,
                        });

                        const strkTokenAddress =
                            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

                        const result = await provider.callContract({
                            contractAddress: strkTokenAddress,
                            entrypoint: 'balanceOf',
                            calldata: [addr.address as string],
                        });

                        const balanceHex =
                            result && result[0] ? result[0] : '0x0';
                        const balanceDecimal = parseInt(balanceHex, 16);
                        const balanceInSTRK = (
                            balanceDecimal / 1e18
                        ).toString();

                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: balanceInSTRK,
                            symbol: 'STRK',
                        });

                        // Check if account needs deployment
                        if (balanceDecimal > 0 && addr.encryptedPrivateKey) {
                            try {
                                // Check if already deployed
                                await provider.getClassHashAt(addr.address as string);
                                console.log(`[DEBUG] Starknet account ${addr.address as string} already deployed`);
                            } catch (error) {
                                // Account not deployed, check balance and deploy
                                console.log(`[DEBUG] Checking if ${addr.address} can be deployed...`);
                                
                                const { hasSufficientFunds, balance } = await checkBalance(
                                    provider,
                                    addr.address as string
                                );

                                if (hasSufficientFunds) {
                                    console.log(`[DEBUG] Deploying Starknet account ${addr.address}...`);
                                    
                                    // Decrypt private key
                                    const privateKey = decrypt(addr.encryptedPrivateKey);
                                    
                                    // Get public key from private key
                                    const publicKey = ec.starkCurve.getStarkKey(privateKey);
                                    
                                    // Deploy the account
                                    await deployStrkWallet(
                                        provider,
                                        privateKey,
                                        publicKey,
                                        addr.address as string,
                                        false // Skip balance check since we already did it
                                    );

                                    console.log(`[SUCCESS] Starknet account ${addr.address} deployed successfully`);
                                    
                                    // Update last balance entry to indicate deployment
                                    balances[balances.length - 1].deployed = true;
                                    balances[balances.length - 1].deploymentStatus = 'success';

                                    // Create notification for deployment
                                    await AppDataSource.getRepository(Notification).save({
                                        userId: req.user!.id,
                                        type: NotificationType.DEPOSIT,
                                        title: 'Starknet Account Deployed',
                                        message: `Your Starknet testnet account has been successfully deployed at ${addr.address}`,
                                        details: {
                                            address: addr.address,
                                            chain: 'starknet',
                                            network: 'testnet',
                                            balance: balanceInSTRK,
                                        },
                                        isRead: false,
                                        createdAt: new Date(),
                                    });
                                } else {
                                    console.log(`[DEBUG] Insufficient funds for deployment. Balance: ${balance}`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Starknet testnet balance/deployment error:', error);
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'STRK',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'ethereum') {
                    // ... [rest of your ethereum code]
                } else if (addr.chain === 'bitcoin') {
                    // ... [rest of your bitcoin code]
                } else if (addr.chain === 'solana') {
                    // ... [rest of your solana code]
                } else if (
                    addr.chain === 'usdt_erc20' ||
                    addr.chain === 'usdt_trc20'
                ) {
                    balances.push({
                        chain: addr.chain,
                        network: 'testnet',
                        address: addr.address,
                        balance: '0',
                        symbol: 'USDT',
                    });
                }
            }

            res.status(200).json({
                message: 'Testnet balances retrieved successfully',
                balances,
                totalAddresses: addresses.length,
            });
        } catch (error) {
            console.error('Get testnet balances error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get mainnet balances for the authenticated user
     * Returns balances for all mainnet addresses only
     * Also checks and deploys Starknet accounts if they have sufficient funds
     */
static async getMainnetBalancesDeploy(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        const addressRepo = AppDataSource.getRepository(UserAddress);
        const addresses = await addressRepo.find({
            where: {
                userId: req.user!.id,
                network: NetworkType.MAINNET,
            },
        });

        const balances: any[] = [];

        for (const addr of addresses) {
            if (addr.chain === 'starknet') {
    try {
        // Use v0_9 to match getMainnetBalances
        const provider = new RpcProvider({
            nodeUrl: `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`,
        });

        const strkTokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

        // Check STRK balance - use 'latest' like in getMainnetBalances
        const strkResult = await provider.callContract({
            contractAddress: strkTokenAddress,
            entrypoint: 'balanceOf',
            calldata: [addr.address as string],
        }, 'latest');

        const strkBalanceHex = strkResult && strkResult[0] ? strkResult[0] : '0x0';
        const strkBalanceDecimal = parseInt(strkBalanceHex, 16);
        const balanceInSTRK = (strkBalanceDecimal / 1e18).toString();

        console.log(`[DEBUG] Mainnet ${addr.address}: ${balanceInSTRK} STRK`);

        balances.push({
            chain: addr.chain,
            network: 'mainnet',
            address: addr.address,
            balance: balanceInSTRK,
            symbol: 'STRK',
        });

        // Check if account needs deployment (only if has balance and private key)
        if (strkBalanceDecimal > 0 && addr.encryptedPrivateKey) {
            try {
                // Check if already deployed
                const classHash = await provider.getClassHashAt(addr.address as string);
                console.log(`[DEBUG] Account ${addr.address as string} already deployed (classHash: ${classHash})`);
            } catch (deployCheckError: any) {
                // Account not deployed
                console.log(`[DEBUG] Account ${addr.address} not deployed yet`);
                console.log(`[DEBUG] Checking if can deploy with STRK...`);
                
                    try {
                    // INLINE balance check to avoid caching issues
                    // Prefer checking STRK first for mainnet deployments (default fee token)
                    console.log('[DEBUG] Performing INLINE balance check (STRK-first)...');
                    const strkTokenAddr = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                    const ethTokenAddr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
                    const minBal = BigInt('500000000000000000');

                    // Check STRK first (default)
                    const strkRes = await provider.callContract({
                        contractAddress: strkTokenAddr,
                        entrypoint: 'balanceOf',
                        calldata: [addr.address as string],
                    }, 'latest');
                    const strkBal = BigInt(strkRes?.[0] || '0');

                    console.log(`[DEBUG] INLINE STRK Balance: ${Number(strkBal) / 1e18} STRK`);

                    // If STRK is sufficient, prefer STRK for deployment fees
                    let hasSufficientFunds = false;
                    let balance = strkBal;
                    let token: 'STRK' | 'ETH' = 'STRK';

                    if (strkBal >= minBal) {
                        hasSufficientFunds = true;
                        balance = strkBal;
                        token = 'STRK';
                    } else {
                        // Fallback: check ETH (native gas token)
                        const ethRes = await provider.callContract({
                            contractAddress: ethTokenAddr,
                            entrypoint: 'balanceOf',
                            calldata: [addr.address as string],
                        }, 'latest');
                        const ethBal = BigInt(ethRes?.[0] || '0');

                        console.log(`[DEBUG] INLINE ETH Balance: ${Number(ethBal) / 1e18} ETH`);

                        if (ethBal >= minBal) {
                            hasSufficientFunds = true;
                            balance = ethBal;
                            token = 'ETH';
                        } else {
                            balance = strkBal; // keep STRK as primary value if neither sufficient
                            token = 'STRK';
                        }
                    }

                    const balanceFormatted = (Number(balance) / 1e18).toFixed(4);
                    
                    console.log(`[DEBUG] Deployment check results:`);
                    console.log(`  - Fee Token: ${token}`);
                    console.log(`  - Sufficient ${token}: ${hasSufficientFunds}`);
                    console.log(`  - Current Balance: ${balanceFormatted} ${token}`);
                    console.log(`  - Required Balance: 0.5 ${token}`);

                    if (hasSufficientFunds) {
                        console.log(`[DEBUG] ✅ Starting deployment with ${token} fee token...`);
                        
                        // Decrypt private key
                        const privateKey = decrypt(addr.encryptedPrivateKey);
                        const publicKey = ec.starkCurve.getStarkKey(privateKey);
                        
                        console.log(`[DEBUG] Private key decrypted, public key: ${publicKey}`);

                        // Deploy with STRK fee token
                        const deployResult = await deployStrkWallet(
                            provider,
                            privateKey,
                            publicKey,
                            addr.address,
                            false // Skip balance check (we already did it)
                        );

                        const txHash = deployResult.transactionHash || '';
                        const contractAddr = deployResult.contractAddress || addr.address;

                        console.log(`[SUCCESS] ✅ Mainnet account deployed!`);
                        console.log(`[SUCCESS] Transaction hash: ${txHash}`);
                        console.log(`[SUCCESS] Contract address: ${contractAddr}`);
                        console.log(`[SUCCESS] Fee paid in: ${token}`);

                        balances[balances.length - 1].deployed = true;
                        balances[balances.length - 1].deploymentStatus = 'success';
                        balances[balances.length - 1].feeToken = token;
                        balances[balances.length - 1].transactionHash = txHash;

                        // Create notification
                        await AppDataSource.getRepository(Notification).save({
                            userId: req.user!.id,
                            type: NotificationType.DEPOSIT,
                            title: 'Starknet Account Deployed',
                            message: `Your Starknet mainnet account has been deployed at ${addr.address} using ${token} for gas fees`,
                            details: {
                                address: addr.address,
                                chain: 'starknet',
                                network: 'mainnet',
                                balance: balanceInSTRK,
                                feeToken: token,
                                transactionHash: txHash,
                            },
                            isRead: false,
                            createdAt: new Date(),
                        });
                    } else {
                        console.log(`[WARNING] ❌ Insufficient ${token} for deployment`);
                        console.log(`  Current: ${balanceFormatted} ${token}`);
                        console.log(`  Required: 0.5 ${token} minimum`);
                        console.log(`  💡 You have ${balanceInSTRK} STRK but need ${token === 'ETH' ? 'ETH' : 'more STRK'} to deploy`);
                        
                        balances[balances.length - 1].deploymentStatus = 'insufficient_balance';
                        balances[balances.length - 1].requiredToken = token;
                        balances[balances.length - 1].requiredAmount = '0.5';
                        balances[balances.length - 1].currentAmount = balanceFormatted;
                    }
                } catch (deployError: any) {
                    console.error(`[ERROR] Deployment failed:`, deployError?.message || deployError);
                    
                    // Log more details for debugging
                    if (deployError?.message) {
                        console.error(`[ERROR] Error message: ${deployError.message}`);
                    }
                    if (deployError?.stack) {
                        console.error(`[ERROR] Stack trace:`, deployError.stack);
                    }
                    
                    balances[balances.length - 1].deploymentStatus = 'failed';
                    balances[balances.length - 1].deploymentError = deployError?.message || 'Unknown error';
                }
            }
        } else if (!addr.encryptedPrivateKey) {
            console.log(`[DEBUG] No private key available for ${addr.address} - cannot deploy`);
        }
    } catch (error: any) {
        console.error('Starknet mainnet balance/deployment error:', error?.message || error);
        balances.push({
            chain: addr.chain,
            network: 'mainnet',
            address: addr.address,
            balance: '0',
            symbol: 'STRK',
            error: 'Failed to fetch balance',
        });
    }
} else if (addr.chain === 'ethereum') {
                // ... [your ethereum code]
            } else if (addr.chain === 'bitcoin') {
                // ... [your bitcoin code]
            } else if (addr.chain === 'solana') {
                // ... [your solana code]
            } else if (addr.chain === 'usdt_erc20' || addr.chain === 'usdt_trc20') {
                balances.push({
                    chain: addr.chain,
                    network: 'mainnet',
                    address: addr.address,
                    balance: '0',
                    symbol: 'USDT',
                });
            }
        }

        res.status(200).json({
            message: 'Mainnet balances retrieved successfully',
            balances,
            totalAddresses: addresses.length,
        });
    } catch (error) {
        console.error('Get mainnet balances error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

    // ... [rest of your existing methods]
}