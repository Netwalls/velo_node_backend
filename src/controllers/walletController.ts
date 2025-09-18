import { Transaction } from '../entities/Transaction';
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { UserAddress } from '../entities/UserAddress';
import { AuthRequest } from '../types';
import { RpcProvider } from 'starknet';
import { ethers } from 'ethers';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';

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
    static async sendTransaction(req: Request, res: Response): Promise<void> {
        const { userId, chain, network, toAddress, amount } = req.body;
        // Basic input validation
        if (!userId || !chain || !network || !toAddress || !amount) {
            res.status(400).json({ error: 'Missing required fields.' });
            return;
        }
        if (typeof amount !== 'string' && typeof amount !== 'number') {
            res.status(400).json({ error: 'Invalid amount.' });
            return;
        }
        if (Number(amount) <= 0) {
            res.status(400).json({ error: 'Amount must be positive.' });
            return;
        }
        if (typeof toAddress !== 'string' || toAddress.length < 10) {
            res.status(400).json({ error: 'Invalid toAddress.' });
            return;
        }
        // Save transaction as pending
        const txRepo = AppDataSource.getRepository(Transaction);
        let txEntity = txRepo.create({
            userId,
            chain,
            txHash: '',
            status: 'pending',
            details: { network, toAddress, amount },
        });
        txEntity = await txRepo.save(txEntity);
        try {
            const addressRepo = AppDataSource.getRepository(UserAddress);
            const userAddress = await addressRepo.findOne({
                where: { userId, chain, network },
            });
            if (!userAddress || !userAddress.encryptedPrivateKey) {
                txEntity.status = 'failed';
                txEntity.error = 'Wallet not found for user.';
                await txRepo.save(txEntity);
                res.status(404).json({ error: 'Wallet not found for user.' });
                return;
            }
            // TODO: Decrypt private key securely
            // import { decrypt } from '../utils/keygen';
            const { decrypt } = require('../utils/keygen');
            const privateKey = decrypt(userAddress.encryptedPrivateKey);

            let txHash = '';
            if (chain === 'ethereum') {
                // ETH send logic
                const providerUrl =
                    network === 'testnet'
                        ? 'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                        : 'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI';
                const { ethers } = require('ethers');
                const provider = new ethers.JsonRpcProvider(providerUrl);
                const wallet = new ethers.Wallet(privateKey, provider);
                const tx = await wallet.sendTransaction({
                    to: toAddress,
                    value: ethers.parseEther(amount),
                });
                txHash = tx.hash;
            } else if (chain === 'bitcoin') {
                // BTC send logic (mainnet/testnet)
                const bitcoin = require('bitcoinjs-lib');
                const ecc = require('tiny-secp256k1');
                const { ECPairFactory } = require('ecpair');
                const ECPair = ECPairFactory(ecc);
                const networkObj =
                    network === 'testnet'
                        ? bitcoin.networks.testnet
                        : bitcoin.networks.bitcoin;
                const keyPair = ECPair.fromWIF(privateKey, networkObj);
                // Fetch UTXOs from Blockstream API
                const utxoUrl =
                    (network === 'testnet'
                        ? 'https://blockstream.info/testnet/api/'
                        : 'https://blockstream.info/api/') +
                    `address/${userAddress.address}/utxo`;
                const utxos = (await axios.get(utxoUrl)).data as Array<{
                    txid: string;
                    vout: number;
                    value: number;
                }>;
                if (!Array.isArray(utxos) || utxos.length === 0) {
                    res.status(400).json({ error: 'No UTXOs to spend.' });
                    return;
                }
                const psbt = new bitcoin.Psbt({ network: networkObj });
                let inputSum = 0;
                const sendAmount = Math.floor(Number(amount) * 1e8); // BTC to satoshis
                // Add UTXOs as inputs
                for (const utxo of utxos) {
                    psbt.addInput({
                        hash: utxo.txid,
                        index: utxo.vout,
                        witnessUtxo: {
                            script: bitcoin.address.toOutputScript(
                                userAddress.address,
                                networkObj
                            ),
                            value: utxo.value,
                        },
                    });
                    inputSum += utxo.value;
                    if (inputSum >= sendAmount + 1000) break; // 1000 sat fee buffer
                }
                if (inputSum < sendAmount + 1000) {
                    res.status(400).json({ error: 'Insufficient balance.' });
                    return;
                }
                // Add output to recipient
                psbt.addOutput({ address: toAddress, value: sendAmount });
                // Add change output if needed
                const change = inputSum - sendAmount - 1000;
                if (change > 0) {
                    psbt.addOutput({
                        address: userAddress.address,
                        value: change,
                    });
                }
                // Sign all inputs
                psbt.signAllInputs(keyPair);
                psbt.finalizeAllInputs();
                const txHex = psbt.extractTransaction().toHex();
                // Broadcast
                const broadcastUrl =
                    (network === 'testnet'
                        ? 'https://blockstream.info/testnet/api/'
                        : 'https://blockstream.info/api/') + 'tx';
                const resp = await axios.post(broadcastUrl, txHex, {
                    headers: { 'Content-Type': 'text/plain' },
                });
                txHash = String(resp.data);
            } else if (chain === 'solana') {
                // SOL send logic
                const endpoint =
                    network === 'testnet'
                        ? 'https://api.testnet.solana.com'
                        : 'https://api.mainnet-beta.solana.com';
                const {
                    Connection,
                    Keypair,
                    PublicKey,
                    LAMPORTS_PER_SOL,
                    Transaction,
                    SystemProgram,
                    sendAndConfirmTransaction,
                } = require('@solana/web3.js');
                const connection = new Connection(endpoint);
                const fromKeypair = Keypair.fromSecretKey(
                    Buffer.from(privateKey, 'hex')
                );
                const toPubkey = new PublicKey(toAddress);
                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: fromKeypair.publicKey,
                        toPubkey,
                        lamports: Math.floor(Number(amount) * LAMPORTS_PER_SOL),
                    })
                );
                const signature = await sendAndConfirmTransaction(
                    connection,
                    tx,
                    [fromKeypair]
                );
                txHash = signature;
            } else if (chain === 'starknet') {
                // STRK send logic (mainnet/testnet)
                const {
                    Account,
                    RpcProvider,
                    ec,
                    number,
                } = require('starknet');
                const nodeUrl =
                    network === 'testnet'
                        ? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI'
                        : 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI';
                const provider = new RpcProvider({ nodeUrl });
                const keyPair = ec.getKeyPair(privateKey);
                const account = new Account(
                    provider,
                    userAddress.address,
                    keyPair
                );
                // STRK token contract address (same as balance fetch)
                const tokenAddress =
                    '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                // Transfer method selector and calldata
                const recipient = toAddress;
                const amountUint256 = number.toUint256(amount);
                const tx = await account.execute({
                    contractAddress: tokenAddress,
                    entrypoint: 'transfer',
                    calldata: [
                        recipient,
                        amountUint256.low,
                        amountUint256.high,
                    ],
                });
                txHash = tx.transaction_hash;
            } else {
                res.status(400).json({ error: 'Unsupported chain.' });
                return;
            }
            // Update transaction as confirmed
            txEntity.txHash = txHash;
            txEntity.status = 'confirmed';
            await txRepo.save(txEntity);
            res.json({ txHash });
        } catch (error) {
            // Update transaction as failed
            txEntity.status = 'failed';
            txEntity.error =
                error instanceof Error ? error.message : String(error);
            await txRepo.save(txEntity);
            console.error('Send transaction error:', error);
            res.status(500).json({ error: 'Failed to send transaction.' });
        }
    }
}
