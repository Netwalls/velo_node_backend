import { Transaction } from '../entities/Transaction';
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
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
import * as ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
const ECPair = ECPairFactory.ECPairFactory(ecc);
import axios from 'axios';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
export class WalletController {
    /**
     * Get balances for a specific user by userId (admin or public endpoint).
     * @param req Express request (expects req.params.userId)
     * @param res Express response
     */
    static async getBalancesByUserId(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { userId } = req.params;
            const { network } = req.query;
            if (!userId) {
                res.status(400).json({ error: 'userId param is required' });
                return;
            }
            const addressRepo = AppDataSource.getRepository(UserAddress);
            let where: any = { userId };
            if (network) where.network = network;
            console.log('[DEBUG] getBalancesByUserId:', { userId, network });
            const addresses = await addressRepo.find({ where });
            console.log('[DEBUG] Found addresses:', addresses);
            const balances: any[] = [];
            for (const addr of addresses) {
                // ETH endpoints
                const ETH_MAINNET =
                    'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI';
                const ETH_TESTNET =
                    'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI';
                // BTC endpoints
                const BTC_MAINNET = 'https://blockstream.info/api/address/';
                const BTC_TESTNET =
                    'https://blockstream.info/testnet/api/address/';
                // SOL endpoints
                const SOL_MAINNET =
                    'https://solana-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI';
                const SOL_TESTNET =
                    'https://solana-testnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI';
                // STRK endpoints
                const STRK_MAINNET =
                    'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI';
                const STRK_TESTNET =
                    'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI';

                if (addr.chain === 'starknet') {
                    try {
                        const provider = new RpcProvider({
                            nodeUrl:
                                addr.network === 'testnet'
                                    ? STRK_TESTNET
                                    : STRK_MAINNET,
                        });
                        const tokenAddress =
                            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                        const erc20Abi = [
                            {
                                name: 'balanceOf',
                                type: 'function',
                                inputs: [{ name: 'account', type: 'felt' }],
                                outputs: [{ name: 'balance', type: 'felt' }],
                            },
                        ];
                        // @ts-ignore
                        const { Contract } = require('starknet');
                        const contract = new Contract(
                            erc20Abi,
                            tokenAddress,
                            provider
                        );
                        const balanceResult = await contract.balanceOf(
                            addr.address
                        );
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: balanceResult.balance.toString(),
                        });
                    } catch (err) {
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: '0',
                            error: 'Failed to fetch',
                        });
                    }
                } else if (addr.chain === 'ethereum') {
                    try {
                        const provider = new ethers.JsonRpcProvider(
                            addr.network === 'testnet'
                                ? ETH_TESTNET
                                : ETH_MAINNET
                        );
                        const balance = await provider.getBalance(addr.address);
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: ethers.formatEther(balance),
                        });
                    } catch (err) {
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: '0',
                            error: 'Failed to fetch',
                        });
                    }
                } else if (addr.chain === 'bitcoin') {
                    try {
                        const url =
                            (addr.network === 'testnet'
                                ? BTC_TESTNET
                                : BTC_MAINNET) + addr.address;
                        const resp = await axios.get(url);
                        const data = resp.data as {
                            chain_stats: {
                                funded_txo_sum: number;
                                spent_txo_sum: number;
                            };
                        };
                        const balance =
                            data.chain_stats.funded_txo_sum -
                            data.chain_stats.spent_txo_sum;
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: (balance / 1e8).toString(),
                        });
                    } catch (err) {
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: '0',
                            error: 'Failed to fetch',
                        });
                    }
                } else if (addr.chain === 'solana') {
                    try {
                        const connection = new Connection(
                            addr.network === 'testnet'
                                ? SOL_TESTNET
                                : SOL_MAINNET
                        );
                        const publicKey = new PublicKey(addr.address);
                        const balance = await connection.getBalance(publicKey);
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: (balance / 1e9).toString(),
                        });
                    } catch (err) {
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: '0',
                            error: 'Failed to fetch',
                        });
                    }
                } else {
                    balances.push({
                        chain: addr.chain,
                        network: addr.network,
                        address: addr.address,
                        balance: '0',
                        error: 'Unsupported chain',
                    });
                }
            }
            res.json({ balances });
        } catch (error) {
            console.error('Get balances by userId error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Controller for wallet-related actions.
     * Provides endpoints to fetch balances for all supported blockchains (ETH, BTC, SOL, STRK) for the authenticated user.
     */
    static async getBalances(req: AuthRequest, res: Response): Promise<void> {
        /*
         * Fetches all blockchain addresses for the current user and retrieves their balances.
         * Supported chains:
         * - Ethereum (ETH)
         * - Bitcoin (BTC)
         * - Solana (SOL)
         * - Starknet (STRK)
         *
         * Returns an array of balances for each address/chain.
         */
        try {
            // Get all addresses for the user from the database
            const addressRepo = AppDataSource.getRepository(UserAddress);
            const addresses = await addressRepo.find({
                where: { userId: req.user!.id },
            });
            const balances: any[] = [];
            // Loop through each address and fetch its balance based on chain type
            for (const addr of addresses) {
                if (addr.chain === 'starknet') {
                    // STRK (Starknet) balance using starknet.js
                    try {
                        // Create a Starknet RPC provider
                        const provider = new RpcProvider({
                            nodeUrl:
                                'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI',
                        });
                        // STRK token contract address (update if needed)
                        const tokenAddress =
                            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                        // Minimal ERC20 ABI for balanceOf
                        const erc20Abi = [
                            {
                                name: 'balanceOf',
                                type: 'function',
                                inputs: [{ name: 'account', type: 'felt' }],
                                outputs: [{ name: 'balance', type: 'felt' }],
                            },
                        ];
                        // Import Contract class from starknet.js
                        // @ts-ignore
                        const { Contract } = require('starknet');
                        // Create contract instance for STRK token
                        const contract = new Contract(
                            erc20Abi,
                            tokenAddress,
                            provider
                        );
                        // Call balanceOf to get the user's STRK balance
                        const balanceResult = await contract.balanceOf(
                            addr.address
                        );
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: balanceResult.balance.toString(),
                        });
                    } catch (err) {
                        // Handle errors for STRK balance fetch
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: null,
                            error: 'Failed to fetch',
                        });
                    }
                } else if (addr.chain === 'ethereum') {
                    // ETH balance using ethers.js
                    try {
                        // Use a public Ethereum RPC provider
                        const provider = new ethers.JsonRpcProvider(
                            'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        );
                        // Get balance in wei and convert to ETH
                        const balance = await provider.getBalance(addr.address);
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: ethers.formatEther(balance),
                        });
                    } catch (err) {
                        // Handle errors for ETH balance fetch
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: null,
                            error: 'Failed to fetch',
                        });
                    }
                } else if (addr.chain === 'bitcoin') {
                    // BTC balance using blockstream.info API
                    try {
                        // Use blockstream.info public API to get BTC address stats
                        const url = `https://blockstream.info/api/address/${addr.address}`;
                        const resp = await axios.get(url);
                        // The API returns funded and spent satoshis; subtract to get current balance
                        const data = resp.data as {
                            chain_stats: {
                                funded_txo_sum: number;
                                spent_txo_sum: number;
                            };
                        };
                        const balance =
                            data.chain_stats.funded_txo_sum -
                            data.chain_stats.spent_txo_sum;
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: (balance / 1e8).toString(), // Convert satoshis to BTC
                        });
                    } catch (err) {
                        // Handle errors for BTC balance fetch
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: null,
                            error: 'Failed to fetch',
                        });
                    }
                } else if (addr.chain === 'solana') {
                    // SOL balance using @solana/web3.js
                    try {
                        // Connect to Solana mainnet
                        const connection = new Connection(
                            'https://solana-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        );
                        // Convert address to PublicKey and fetch balance in lamports
                        const publicKey = new PublicKey(addr.address);
                        const balance = await connection.getBalance(publicKey);
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: (balance / 1e9).toString(), // Convert lamports to SOL
                        });
                    } catch (err) {
                        // Handle errors for SOL balance fetch
                        balances.push({
                            chain: addr.chain,
                            address: addr.address,
                            balance: null,
                            error: 'Failed to fetch',
                        });
                    }
                } else {
                    // Unknown or unsupported chain type
                    balances.push({
                        chain: addr.chain,
                        address: addr.address,
                        balance: null,
                        error: 'Unsupported chain',
                    });
                }
            }
            res.json({ balances });
        } catch (error) {
            console.error('Get balances error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Send funds from a user's wallet to another address for a given chain/network.
     * POST /wallet/send
     * Body: { userId, chain, network, toAddress, amount }
     */
    // static async sendTransaction(
    //     req: AuthRequest,
    //     res: Response
    // ): Promise<void> {
    //     try {
    //         const { chain, network, toAddress, amount, fromAddress } = req.body;
    //         if (!req.user || !req.user.id) {
    //             res.status(401).json({ error: 'Unauthorized' });
    //             return;
    //         }
    //         const userId = req.user.id;

    //         // Find the sender address for this user, chain, network (and optionally fromAddress)
    //         const addressRepo = AppDataSource.getRepository(UserAddress);
    //         const where: any = { userId, chain, network };
    //         if (fromAddress) where.address = fromAddress;
    //         const userAddress = await addressRepo.findOne({ where });

    //         // Check for private key
    //         if (!userAddress || !userAddress.encryptedPrivateKey) {
    //             res.status(400).json({
    //                 error: 'No private key found for this address. You can only send from wallets you created in Velo.',
    //             });
    //             return;
    //         }

    //         // Decrypt the private key
    //         const { decrypt } = require('../utils/keygen');
    //         const privateKey = decrypt(userAddress.encryptedPrivateKey);

    //         let txHash = '';

    //         // ETH & USDT ERC20
    //         if (chain === 'ethereum' || chain === 'usdt_erc20') {
    //             const provider = new ethers.JsonRpcProvider(
    //                 network === 'testnet'
    //                     ? 'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
    //                     : 'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
    //             );
    //             const wallet = new ethers.Wallet(privateKey, provider);

    //             if (chain === 'ethereum') {
    //                 const tx = await wallet.sendTransaction({
    //                     to: toAddress,
    //                     value: ethers.parseEther(amount.toString()),
    //                 });
    //                 txHash = tx.hash;
    //             } else {
    //                 const usdtAddress =
    //                     network === 'testnet'
    //                         ? '0x516de3a7a567d81737e3a46ec4ff9cfd1fcb0136' // Sepolia USDT
    //                         : '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // Mainnet USDT
    //                 const usdtAbi = [
    //                     'function transfer(address to, uint256 value) public returns (bool)',
    //                 ];
    //                 const usdtContract = new ethers.Contract(
    //                     usdtAddress,
    //                     usdtAbi,
    //                     wallet
    //                 );
    //                 const decimals = 6;
    //                 const tx = await usdtContract.transfer(
    //                     toAddress,
    //                     ethers.parseUnits(amount.toString(), decimals)
    //                 );
    //                 txHash = tx.hash;
    //             }
    //         }
    //         // SOL
    //         else if (chain === 'solana') {
    //             const connection = new Connection(
    //                 network === 'testnet'
    //                     ? 'https://api.devnet.solana.com'
    //                     : 'https://api.mainnet-beta.solana.com'
    //             );
    //             const fromKeypair = Keypair.fromSecretKey(
    //                 Uint8Array.from(JSON.parse(privateKey))
    //             );
    //             const toPubkey = new PublicKey(toAddress);

    //             const transaction = new SolTx().add(
    //                 SystemProgram.transfer({
    //                     fromPubkey: fromKeypair.publicKey,
    //                     toPubkey,
    //                     lamports: Math.round(Number(amount) * 1e9),
    //                 })
    //             );
    //             const signature = await sendAndConfirmTransaction(
    //                 connection,
    //                 transaction,
    //                 [fromKeypair]
    //             );
    //             txHash = signature;
    //         }
    //         // STRK (Starknet)
    //         else if (chain === 'starknet') {
    //             const provider = new RpcProvider({
    //                 nodeUrl:
    //                     network === 'testnet'
    //                         ? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI'
    //                         : 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/CP1fRkzqgL_nwb9DNNiKI',
    //             });
    //             const keyPair = ec.getKeyPair(privateKey);
    //             const account = new Account(
    //                 provider,
    //                 userAddress.address,
    //                 keyPair
    //             );

    //             const tokenAddress =
    //                 '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
    //             const recipient = toAddress;
    //             const amountUint256 = uint256.bnToUint256(BigInt(amount));

    //             const tx = await account.execute({
    //                 contractAddress: tokenAddress,
    //                 entrypoint: 'transfer',
    //                 calldata: [
    //                     recipient,
    //                     amountUint256.low,
    //                     amountUint256.high,
    //                 ],
    //             });
    //             txHash = tx.transaction_hash;
    //         }
    //         // BTC
    //         else if (chain === 'bitcoin') {
    //             const apiUrl =
    //                 network === 'testnet'
    //                     ? `https://blockstream.info/testnet/api/address/${userAddress.address}/utxo`
    //                     : `https://blockstream.info/api/address/${userAddress.address}/utxo`;
    //             const utxos = (await axios.get(apiUrl)).data;

    //             const networkParams =
    //                 network === 'testnet'
    //                     ? bitcoin.networks.testnet
    //                     : bitcoin.networks.bitcoin;
    //             const psbt = new bitcoin.Psbt({ network: networkParams });

    //             let inputSum = 0;
    //             for (const utxo of utxos) {
    //                 psbt.addInput({
    //                     hash: utxo.txid,
    //                     index: utxo.vout,
    //                     witnessUtxo: {
    //                         script: Buffer.from(utxo.scriptpubkey, 'hex'),
    //                         value: utxo.value,
    //                     },
    //                 });
    //                 inputSum += utxo.value;
    //                 if (inputSum >= Math.round(Number(amount) * 1e8) + 1000)
    //                     break;
    //             }
    //             if (inputSum < Math.round(Number(amount) * 1e8) + 1000) {
    //                 throw new Error('Insufficient BTC balance');
    //             }

    //             psbt.addOutput({
    //                 address: toAddress,
    //                 value: Math.round(Number(amount) * 1e8),
    //             });
    //             const change =
    //                 inputSum - Math.round(Number(amount) * 1e8) - 1000;
    //             if (change > 0) {
    //                 psbt.addOutput({
    //                     address: userAddress.address,
    //                     value: change,
    //                 });
    //             }
    //             const keyPair = ECPair.fromWIF(privateKey, networkParams);
    //             // Patch keyPair to ensure publicKey is a Buffer (not Uint8Array)
    //             const patchedKeyPair = {
    //                 ...keyPair,
    //                 publicKey: Buffer.from(keyPair.publicKey),
    //                 sign: (hash: Buffer, lowR?: boolean) => {
    //                     const sig = keyPair.sign(hash, lowR);
    //                     return Buffer.from(sig);
    //                 },
    //                 signSchnorr: (hash: Buffer) => {
    //                     // Convert the result to Buffer to satisfy the Signer interface
    //                     const sig = keyPair.signSchnorr(hash);
    //                     return Buffer.from(sig);
    //                 },
    //             };
    //             psbt.signAllInputs(patchedKeyPair);
    //             psbt.finalizeAllInputs();

    //             const rawTx = psbt.extractTransaction().toHex();
    //             const broadcastUrl =
    //                 network === 'testnet'
    //                     ? 'https://blockstream.info/testnet/api/tx'
    //                     : 'https://blockstream.info/api/tx';
    //             const resp = await axios.post(broadcastUrl, rawTx, {
    //                 headers: { 'Content-Type': 'text/plain' },
    //             });
    //             txHash = resp.data as string;
    //         }
    //         // USDT TRC20 (Tron) - NOT IMPLEMENTED
    //         else if (chain === 'usdt_trc20') {
    //             throw new Error(
    //                 'USDT TRC20 transfers not implemented. Use TronWeb.'
    //             );
    //         } else {
    //             throw new Error('Unsupported chain');
    //         }

    //         res.json({ message: 'Transaction sent', txHash });
    //     } catch (error) {
    //         console.error('Send transaction error:', error);
    //         res.status(500).json({
    //             error: 'Failed to send transaction',
    //             details:
    //                 typeof error === 'object' &&
    //                 error !== null &&
    //                 'message' in error
    //                     ? (error as any).message
    //                     : String(error),
    //         });
    //     }
    // }

    /**
 * Send funds from a user's wallet to another address for a given chain/network.
 * POST /wallet/send
 * Body: { chain, network, toAddress, amount, fromAddress? }
 */
static async sendTransaction(
    req: AuthRequest,
    res: Response
): Promise<void> {
    try {
        const { chain, network, toAddress, amount, fromAddress } = req.body;
        
        // Validate authenticated user
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const userId = req.user.id;

        // Validation
        if (!chain || !network || !toAddress || !amount) {
            res.status(400).json({ error: 'Missing required fields: chain, network, toAddress, amount' });
            return;
        }
        if (Number(amount) <= 0) {
            res.status(400).json({ error: 'Amount must be positive.' });
            return;
        }

        // Find the user's wallet for this chain/network
        const addressRepo = AppDataSource.getRepository(UserAddress);
        const where: any = { userId, chain, network };
        if (fromAddress) {
            where.address = fromAddress;
        }
        
        const userAddress = await addressRepo.findOne({ where });

        if (!userAddress || !userAddress.encryptedPrivateKey) {
            res.status(404).json({ 
                error: 'No wallet found for this chain/network. You can only send from wallets you created in Velo.' 
            });
            return;
        }

        // Decrypt the private key
        const { decrypt } = require('../utils/keygen');
        const privateKey = decrypt(userAddress.encryptedPrivateKey);

        let txHash = '';

        // ETH & USDT ERC20
        if (chain === 'ethereum' || chain === 'usdt_erc20') {
            const provider = new ethers.JsonRpcProvider(
                network === 'testnet'
                    ? 'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                    : 'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
            );
            const wallet = new ethers.Wallet(privateKey, provider);

            if (chain === 'ethereum') {
                const tx = await wallet.sendTransaction({
                    to: toAddress,
                    value: ethers.parseEther(amount.toString()),
                });
                txHash = tx.hash;
            } else {
                const usdtAddress =
                    network === 'testnet'
                        ? '0x516de3a7a567d81737e3a46ec4ff9cfd1fcb0136' // Sepolia USDT
                        : '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // Mainnet USDT
                const usdtAbi = [
                    'function transfer(address to, uint256 value) public returns (bool)',
                ];
                const usdtContract = new ethers.Contract(
                    usdtAddress,
                    usdtAbi,
                    wallet
                );
                const decimals = 6;
                const tx = await usdtContract.transfer(
                    toAddress,
                    ethers.parseUnits(amount.toString(), decimals)
                );
                txHash = tx.hash;
            }
        }
        // SOL
        else if (chain === 'solana') {
            const connection = new Connection(
                network === 'testnet'
                    ? 'https://api.devnet.solana.com'
                    : 'https://api.mainnet-beta.solana.com'
            );
            const fromKeypair = Keypair.fromSecretKey(
                Uint8Array.from(JSON.parse(privateKey))
            );
            const toPubkey = new PublicKey(toAddress);

            const transaction = new SolTx().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey,
                    lamports: Math.round(Number(amount) * 1e9),
                })
            );
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [fromKeypair]
            );
            txHash = signature;
        }
        // STRK (Starknet) with auto-deployment
        else if (chain === 'starknet') {
            const provider = new RpcProvider({
                nodeUrl:
                    network === 'testnet'
                        ? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI'
                        : 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/CP1fRkzqgL_nwb9DNNiKI',
            });

            // Check if account is deployed
            let isDeployed = false;
            try {
                await provider.getClassHashAt(userAddress.address);
                isDeployed = true;
            } catch {
                isDeployed = false;
            }

            // Auto-deploy if needed
            if (!isDeployed) {
                console.log(`[INFO] Deploying Starknet account: ${userAddress.address}`);
                
                // Account constructor accepts privateKey directly
                const account = new Account(provider, userAddress.address, privateKey);
                
                const publicKey = ec.starkCurve.getStarkKey(privateKey);
                const OZ_ACCOUNT_CLASS_HASH = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';
                
                const deployPayload = {
                    classHash: OZ_ACCOUNT_CLASS_HASH,
                    constructorCalldata: [publicKey],
                    addressSalt: publicKey,
                };

                try {
                    const { transaction_hash } = await account.deployAccount(deployPayload);
                    await provider.waitForTransaction(transaction_hash);
                    console.log(`[INFO] Account deployed successfully: ${transaction_hash}`);
                } catch (deployError) {
                    res.status(400).json({ 
                        error: 'Account deployment failed. Ensure you have enough STRK for gas fees (~0.001-0.003 STRK).',
                        details: deployError instanceof Error ? deployError.message : String(deployError)
                    });
                    return;
                }
            }

            // Proceed with transfer
            const account = new Account(provider, userAddress.address, privateKey);
            const tokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
            const amountUint256 = uint256.bnToUint256(BigInt(Math.floor(Number(amount) * 1e18)));

            const tx = await account.execute({
                contractAddress: tokenAddress,
                entrypoint: 'transfer',
                calldata: [
                    toAddress,
                    amountUint256.low,
                    amountUint256.high,
                ],
            });
            txHash = tx.transaction_hash;
        }
        // BTC
        else if (chain === 'bitcoin') {
            const apiUrl =
                network === 'testnet'
                    ? `https://blockstream.info/testnet/api/address/${userAddress.address}/utxo`
                    : `https://blockstream.info/api/address/${userAddress.address}/utxo`;
            const utxos = (await axios.get(apiUrl)).data as Array<{
                txid: string;
                vout: number;
                value: number;
                status?: any;
                scriptpubkey: string;
            }>;

            const networkParams =
                network === 'testnet'
                    ? bitcoin.networks.testnet
                    : bitcoin.networks.bitcoin;
            const psbt = new bitcoin.Psbt({ network: networkParams });

            let inputSum = 0;
            for (const utxo of utxos) {
                psbt.addInput({
                    hash: utxo.txid,
                    index: utxo.vout,
                    witnessUtxo: {
                        script: Buffer.from(utxo.scriptpubkey, 'hex'),
                        value: utxo.value,
                    },
                });
                inputSum += utxo.value;
                if (inputSum >= Math.round(Number(amount) * 1e8) + 1000)
                    break;
            }
            if (inputSum < Math.round(Number(amount) * 1e8) + 1000) {
                throw new Error('Insufficient BTC balance');
            }

            psbt.addOutput({
                address: toAddress,
                value: Math.round(Number(amount) * 1e8),
            });
            const change =
                inputSum - Math.round(Number(amount) * 1e8) - 1000;
            if (change > 0) {
                psbt.addOutput({
                    address: userAddress.address,
                    value: change,
                });
            }
            const keyPair = ECPair.fromWIF(privateKey, networkParams);
            const patchedKeyPair = {
                ...keyPair,
                publicKey: Buffer.from(keyPair.publicKey),
                sign: (hash: Buffer, lowR?: boolean) => {
                    const sig = keyPair.sign(hash, lowR);
                    return Buffer.from(sig);
                },
                signSchnorr: (hash: Buffer) => {
                    const sig = keyPair.signSchnorr(hash);
                    return Buffer.from(sig);
                },
            };
            psbt.signAllInputs(patchedKeyPair);
            psbt.finalizeAllInputs();

            const rawTx = psbt.extractTransaction().toHex();
            const broadcastUrl =
                network === 'testnet'
                    ? 'https://blockstream.info/testnet/api/tx'
                    : 'https://blockstream.info/api/tx';
            const resp = await axios.post(broadcastUrl, rawTx, {
                headers: { 'Content-Type': 'text/plain' },
            });
            txHash = resp.data as string;
        }
        // USDT TRC20 (Tron) - NOT IMPLEMENTED
        else if (chain === 'usdt_trc20') {
            throw new Error(
                'USDT TRC20 transfers not implemented. Use TronWeb.'
            );
        } else {
            throw new Error('Unsupported chain');
        }

        res.json({ message: 'Transaction sent successfully', txHash });
    } catch (error) {
        console.error('Send transaction error:', error);
        res.status(500).json({
            error: 'Failed to send transaction',
            details:
                typeof error === 'object' &&
                error !== null &&
                'message' in error
                    ? (error as any).message
                    : String(error),
        });
    }
}

    /**
     * Get user wallet addresses
     * Expects authenticated user in req.user
     * Returns all wallet addresses for the user
     */
    static async getWalletAddresses(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const userAddressRepository =
                AppDataSource.getRepository(UserAddress);
            const addresses = await userAddressRepository.find({
                where: { userId },
                select: ['id', 'chain', 'network', 'address', 'addedAt'],
            });

            if (!addresses || addresses.length === 0) {
                res.status(404).json({
                    error: 'No wallet addresses found for this user',
                    addresses: [],
                });
                return;
            }

            // Group addresses by chain for better organization
            const addressesByChain = addresses.reduce((acc, addr) => {
                if (!acc[addr.chain]) {
                    acc[addr.chain] = [];
                }
                acc[addr.chain].push({
                    id: addr.id,
                    chain: addr.chain,
                    network: addr.network,
                    address: addr.address,
                    addedAt: addr.addedAt,
                });
                return acc;
            }, {} as Record<string, any[]>);

            res.status(200).json({
                message: 'Wallet addresses retrieved successfully',
                addresses: addressesByChain,
                totalCount: addresses.length,
            });
        } catch (error) {
            console.error('Get wallet addresses error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get user testnet wallet addresses
     * Returns only chain and address for testnet networks
     */
    static async getTestnetAddresses(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const userAddressRepository =
                AppDataSource.getRepository(UserAddress);
            const addresses = await userAddressRepository.find({
                where: { userId, network: NetworkType.TESTNET },
                select: ['chain', 'address'],
            });

            if (!addresses || addresses.length === 0) {
                res.status(404).json({
                    error: 'No testnet addresses found for this user',
                    addresses: [],
                });
                return;
            }

            // Return simplified format with only chain and address
            const simplifiedAddresses = addresses.map((addr) => ({
                chain: addr.chain,
                address: addr.address,
            }));

            res.status(200).json({
                message: 'Testnet addresses retrieved successfully',
                addresses: simplifiedAddresses,
            });
        } catch (error) {
            console.error('Get testnet addresses error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get user mainnet wallet addresses
     * Returns only chain and address for mainnet networks
     */
    static async getMainnetAddresses(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const userAddressRepository =
                AppDataSource.getRepository(UserAddress);
            const addresses = await userAddressRepository.find({
                where: { userId, network: NetworkType.MAINNET },
                select: ['chain', 'address'],
            });

            if (!addresses || addresses.length === 0) {
                res.status(404).json({
                    error: 'No mainnet addresses found for this user',
                    addresses: [],
                });
                return;
            }

            // Return simplified format with only chain and address
            const simplifiedAddresses = addresses.map((addr) => ({
                chain: addr.chain,
                address: addr.address,
            }));

            res.status(200).json({
                message: 'Mainnet addresses retrieved successfully',
                addresses: simplifiedAddresses,
            });
        } catch (error) {
            console.error('Get mainnet addresses error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get testnet balances for the authenticated user
     * Returns balances for all testnet addresses only
     */
    static async getTestnetBalances(
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
                        // Fixed Starknet testnet balance
                        const provider = new RpcProvider({
                            nodeUrl:
                                'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI',
                        });

                        // CORRECT STRK token contract address for SEPOLIA TESTNET
                        const strkTokenAddress =
                            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

                        console.log(
                            `[DEBUG] Fetching STRK balance for address: ${addr.address}`
                        );
                        console.log(
                            `[DEBUG] Using STRK contract: ${strkTokenAddress}`
                        );

                        // Use the provider's callContract method instead of Contract class
                        const result = await provider.callContract({
                            contractAddress: strkTokenAddress,
                            entrypoint: 'balanceOf',
                            calldata: [addr.address],
                        });

                        console.log(`[DEBUG] Raw balance result:`, result);

                        // FIXED: Parse the result correctly - it should be in result[0]
                        const balanceHex =
                            result && result[0] ? result[0] : '0x0';
                        const balanceDecimal = parseInt(balanceHex, 16);
                        const balanceInSTRK = (
                            balanceDecimal / 1e18
                        ).toString();

                        console.log(`[DEBUG] Balance hex: ${balanceHex}`);
                        console.log(
                            `[DEBUG] Balance decimal: ${balanceDecimal}`
                        );
                        console.log(
                            `[DEBUG] Balance in STRK: ${balanceInSTRK}`
                        );

                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: balanceInSTRK,
                            symbol: 'STRK',
                        });
                    } catch (error) {
                        console.error('Starknet testnet balance error:', error);
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
                    try {
                        // Ethereum testnet balance
                        const provider = new ethers.JsonRpcProvider(
                            'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        );
                        const balance = await provider.getBalance(addr.address);

                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: ethers.formatEther(balance),
                            symbol: 'ETH',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'ETH',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'bitcoin') {
                    try {
                        // Bitcoin testnet balance
                        const response = await axios.get(
                            `https://blockstream.info/testnet/api/address/${addr.address}`
                        );
                        const balanceInSatoshis =
                            (response.data as any).chain_stats
                                ?.funded_txo_sum || 0;
                        const balanceInBTC = balanceInSatoshis / 100000000; // Convert satoshis to BTC

                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: balanceInBTC.toString(),
                            symbol: 'BTC',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'BTC',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'solana') {
                    try {
                        // Solana testnet balance
                        const connection = new Connection(
                            'https://solana-devnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        );
                        const publicKey = new PublicKey(addr.address);
                        const balance = await connection.getBalance(publicKey);
                        const balanceInSOL = balance / 1000000000; // Convert lamports to SOL

                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: balanceInSOL.toString(),
                            symbol: 'SOL',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'SOL',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (
                    addr.chain === 'usdt_erc20' ||
                    addr.chain === 'usdt_trc20'
                ) {
                    // USDT testnet balances
                    balances.push({
                        chain: addr.chain,
                        network: 'testnet',
                        address: addr.address,
                        balance: '0', // Placeholder for now
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
     */
    static async getMainnetBalances(
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

            // Loop through each mainnet address and fetch balance
            for (const addr of addresses) {
                if (addr.chain === 'starknet') {
                    try {
                        // Starknet mainnet balance
                        const provider = new RpcProvider({
                            nodeUrl:
                                'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/CP1fRkzqgL_nwb9DNNiKI',
                        });

                        const contract = {
                            abi: [
                                {
                                    name: 'balanceOf',
                                    type: 'function',
                                    inputs: [{ name: 'account', type: 'felt' }],
                                    outputs: [
                                        { name: 'balance', type: 'felt' },
                                    ],
                                },
                            ],
                        };

                        const contractInstance = new (provider as any).Contract(
                            contract.abi,
                            '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' // ETH contract
                        );

                        const balanceResult = await contractInstance.balanceOf(
                            addr.address
                        );

                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: balanceResult.balance.toString(),
                            symbol: 'STRK',
                        });
                    } catch (error) {
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
                    try {
                        // Ethereum mainnet balance
                        const provider = new ethers.JsonRpcProvider(
                            'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        );
                        const balance = await provider.getBalance(addr.address);

                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: ethers.formatEther(balance),
                            symbol: 'ETH',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'ETH',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'bitcoin') {
                    try {
                        // Bitcoin mainnet balance
                        const response = await axios.get(
                            `https://blockstream.info/api/address/${addr.address}`
                        );
                        const balanceInSatoshis =
                            (response.data as any).chain_stats
                                ?.funded_txo_sum || 0;
                        const balanceInBTC = balanceInSatoshis / 100000000; // Convert satoshis to BTC

                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: balanceInBTC.toString(),
                            symbol: 'BTC',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'BTC',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'solana') {
                    try {
                        // Solana mainnet balance
                        const connection = new Connection(
                            'https://solana-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        );
                        const publicKey = new PublicKey(addr.address);
                        const balance = await connection.getBalance(publicKey);
                        const balanceInSOL = balance / 1000000000; // Convert lamports to SOL

                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: balanceInSOL.toString(),
                            symbol: 'SOL',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'SOL',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (
                    addr.chain === 'usdt_erc20' ||
                    addr.chain === 'usdt_trc20'
                ) {
                    // USDT mainnet balances
                    balances.push({
                        chain: addr.chain,
                        network: 'mainnet',
                        address: addr.address,
                        balance: '0', // Placeholder for now
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

    /**
     * Checks all user addresses for new deposits and creates notifications.
     * Call this periodically (e.g., with a cron job or background worker).
     */
    static async checkForDeposits(): Promise<void> {
        const addressRepo = AppDataSource.getRepository(UserAddress);
        const notificationRepo = AppDataSource.getRepository(Notification);

        const allAddresses = await addressRepo.find();
        for (const addr of allAddresses) {
            let currentBalance = 0;

            try {
                if (addr.chain === 'ethereum') {
                    const provider = new ethers.JsonRpcProvider(
                        addr.network === 'testnet'
                            ? 'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                            : 'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                    );
                    currentBalance = parseFloat(
                        ethers.formatEther(
                            await provider.getBalance(addr.address)
                        )
                    );
                } else if (addr.chain === 'bitcoin') {
                    const url =
                        (addr.network === 'testnet'
                            ? 'https://blockstream.info/testnet/api/address/'
                            : 'https://blockstream.info/api/address/') +
                        addr.address;
                    const resp = await axios.get(url);
                    const data = resp.data as {
                        chain_stats: {
                            funded_txo_sum: number;
                            spent_txo_sum: number;
                        };
                    };
                    const balance =
                        (data.chain_stats.funded_txo_sum || 0) -
                        (data.chain_stats.spent_txo_sum || 0);
                    currentBalance = balance / 1e8;
                } else if (addr.chain === 'solana') {
                    const connection = new Connection(
                        addr.network === 'testnet'
                            ? 'https://solana-devnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                            : 'https://solana-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                    );
                    const publicKey = new PublicKey(addr.address);
                    const balance = await connection.getBalance(publicKey);
                    currentBalance = balance / 1e9;
                } else if (addr.chain === 'starknet') {
                    const provider = new RpcProvider({
                        nodeUrl:
                            addr.network === 'testnet'
                                ? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI'
                                : 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/CP1fRkzqgL_nwb9DNNiKI',
                    });
                    const strkTokenAddress =
                        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                    const result = await provider.callContract({
                        contractAddress: strkTokenAddress,
                        entrypoint: 'balanceOf',
                        calldata: [addr.address],
                    });
                    const balanceHex = result && result[0] ? result[0] : '0x0';
                    const balanceDecimal = parseInt(balanceHex, 16);
                    currentBalance = balanceDecimal / 1e18;
                }
            } catch (e) {
                continue; // skip on error
            }

            // Compare with last known balance
            if (currentBalance > Number(addr.lastKnownBalance)) {
                const amount = currentBalance - Number(addr.lastKnownBalance);

                // Create notification
                await notificationRepo.save(
                    notificationRepo.create({
                        userId: addr.userId,
                        type: NotificationType.DEPOSIT,
                        title: 'Deposit Received',
                        message: `Deposit of ${amount} ${addr.chain.toUpperCase()} received at ${
                            addr.address
                        }`,
                        details: {
                            address: addr.address,
                            amount,
                            chain: addr.chain,
                            network: addr.network,
                        },
                    })
                );
            }

            // Update last known balance
            addr.lastKnownBalance = currentBalance;
            await addressRepo.save(addr);
        }
    }
}
