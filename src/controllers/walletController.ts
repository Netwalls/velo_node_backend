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
// Import ECPair from the 'ecpair' package for compatibility with PSBT
import * as bitcoinjs from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
// Initialize ECPair
const ECPair = ECPairFactory(ecc);
import axios from 'axios';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { AppDataSource } from '../config/database';
import { decrypt } from '../utils/keygen';
import { checkBalance, deployStrkWallet } from '../utils/keygen';

function padStarknetAddress(address: string): string {
    if (!address.startsWith('0x')) return address;
    const hex = address.slice(2).padStart(64, '0');
    return '0x' + hex;
}

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
                const ETH_MAINNET = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                const ETH_TESTNET = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                // BTC endpoints
                const BTC_MAINNET = 'https://blockstream.info/api/address/';
                const BTC_TESTNET =
                    'https://blockstream.info/testnet/api/address/';
                // SOL endpoints
                const SOL_MAINNET = `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                const SOL_TESTNET = `https://solana-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                // STRK endpoints
                const STRK_MAINNET = `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`;
                const STRK_TESTNET = `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`;

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
                    } catch (err: any) {
                        // If Stellar account not found (404) return zero balance silently
                        if (err && err.response && err.response.status === 404) {
                            balances.push({
                                chain: addr.chain,
                                network: addr.network,
                                address: addr.address,
                                balance: '0',
                            });
                        } else {
                            console.debug('Stellar balance fetch failed:', err?.message || err);
                            balances.push({
                                chain: addr.chain,
                                network: addr.network,
                                address: addr.address,
                                balance: '0',
                            });
                        }
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
                        console.debug('Polkadot balance fetch failed:', (err as any)?.message || err);
                        // Return zero balance without an error field to keep API responses clean
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: '0',
                            symbol: 'DOT',
                        });
                    }
                } else if (addr.chain === 'bitcoin') {
                    console.log(
                        `[DEBUG] Checking BTC balance for address: ${addr.address}`
                    );
                    console.log(`[DEBUG] Network: ${addr.network}`);

                    try {
                        const url =
                            (addr.network === 'testnet'
                                ? BTC_TESTNET
                                : BTC_MAINNET) + addr.address;

                        console.log(
                            `[DEBUG] Fetching BTC balance from: ${url}`
                        );

                        const resp = await axios.get(url);
                        const data = resp.data as {
                            chain_stats: {
                                funded_txo_sum: number;
                                spent_txo_sum: number;
                            };
                        };

                        console.log(
                            `[DEBUG] BTC API response for ${addr.address}:`,
                            data
                        );

                        const balance =
                            data.chain_stats.funded_txo_sum -
                            data.chain_stats.spent_txo_sum;

                        console.log(
                            `[DEBUG] Current balance: ${balance} satoshis = ${
                                balance / 1e8
                            } BTC`
                        );

                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: (balance / 1e8).toString(),
                        });
                    } catch (err) {
                        console.error(
                            `[ERROR] Failed to fetch BTC balance for ${addr.address}:`,
                            err
                        );

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
                } else if (addr.chain === 'stellar') {
                    // Stellar balance via Horizon
                    try {
                        const HORIZON_MAIN = 'https://horizon.stellar.org';
                        const HORIZON_TEST = 'https://horizon-testnet.stellar.org';
                        if (!addr.address) throw new Error('No stellar address');
                        const horizonUrl = addr.network === 'testnet' ? HORIZON_TEST : HORIZON_MAIN;
                        const resp = await axios.get(`${horizonUrl}/accounts/${addr.address}`);
                        const data = resp.data as any;
                        const native = (data.balances || []).find((b: any) => b.asset_type === 'native');
                        const balanceStr = native ? native.balance : '0';
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: balanceStr,
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
                } else if (addr.chain === 'polkadot') {
                    // Polkadot balance via @polkadot/api (use derived balances so "transferable" matches polkadot.js UI)
                    try {
                        // @ts-ignore - dynamic require
                        const { ApiPromise, WsProvider } = require('@polkadot/api');
                        const wsUrl = addr.network === 'testnet'
                            ? (process.env.POLKADOT_WS_TESTNET || 'wss://pas-rpc.stakeworld.io')
                            : (process.env.POLKADOT_WS_MAINNET || 'wss://rpc.polkadot.io');
                        const provider = new WsProvider(wsUrl);
                        const api = await ApiPromise.create({ provider });

                        // Use derived balances to match UI (available/transferable)
                        const derived = await api.derive.balances.account(addr.address);
                        const available = (derived && (derived.availableBalance ?? derived.freeBalance ?? derived.free)) || 0;
                        const PLANCK = BigInt(10 ** 10);
                        const availableBig = BigInt(String(available));
                        const dot = (availableBig / PLANCK).toString();

                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: dot,
                            symbol: 'DOT',
                        });

                        try { await api.disconnect(); } catch {}
                    } catch (err) {
                        console.debug('Polkadot balance fetch failed:', (err as any)?.message || err);
                        balances.push({
                            chain: addr.chain,
                            network: addr.network,
                            address: addr.address,
                            balance: '0',
                            symbol: 'DOT',
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
                            nodeUrl: `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`,
                        });
                        // STRK token contract address
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
                            `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
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
                            `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
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
     * Body: { chain, network, toAddress, amount, fromAddress? }
     */
    static async sendTransaction(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { chain, network, toAddress, amount, fromAddress } = req.body;
            const forceSend = req.body && req.body.force === true;

            // Validate authenticated user
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;

            // Validation
            if (!chain || !network || !toAddress || !amount) {
                res.status(400).json({
                    error: 'Missing required fields: chain, network, toAddress, amount',
                });
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
                    error: 'No wallet found for this chain/network. You can only send from wallets you created in Velo.',
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
                        ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                        : `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
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

                // Handle different private key formats
                let secretKeyArray: Uint8Array;

                try {
                    // Try parsing as JSON array first (if stored as [1,2,3,...])
                    const parsed = JSON.parse(privateKey);
                    if (Array.isArray(parsed)) {
                        secretKeyArray = Uint8Array.from(parsed);
                    } else {
                        throw new Error('Not an array');
                    }
                } catch {
                    // If JSON.parse fails, treat as hex string
                    const cleanHex = privateKey.startsWith('0x')
                        ? privateKey.slice(2)
                        : privateKey;
                    const buffer = Buffer.from(cleanHex, 'hex');

                    // Solana keypairs are 64 bytes (32 private + 32 public)
                    if (buffer.length === 32) {
                        // If only private key, we need to generate the full keypair
                        const tempKeypair = Keypair.fromSeed(buffer);
                        secretKeyArray = tempKeypair.secretKey;
                    } else if (buffer.length === 64) {
                        secretKeyArray = new Uint8Array(buffer);
                    } else {
                        throw new Error(
                            `Invalid Solana private key length: ${buffer.length}`
                        );
                    }
                }

                const fromKeypair = Keypair.fromSecretKey(secretKeyArray);
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
            // Add this to your sendTransaction method after the Solana section and before Bitcoin

            // STRK (Starknet)
            else if (chain === 'starknet') {
                const provider = new RpcProvider({
                    nodeUrl:
                        network === 'testnet'
                            ? `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`
                            : `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`,
                });

                // Decrypt the private key
                const privateKey = decrypt(userAddress.encryptedPrivateKey);

                // Get public key from private key
                const publicKey = ec.starkCurve.getStarkKey(privateKey);

                // Check if account is deployed
                let isDeployed = false;
                try {
                    await provider.getClassHashAt(userAddress.address);
                    isDeployed = true;
                    console.log(
                        `[DEBUG] Starknet account ${userAddress.address} is deployed`
                    );
                } catch (error) {
                    console.log(
                        `[DEBUG] Starknet account ${userAddress.address} is NOT deployed`
                    );

                    // Check if account has sufficient funds for deployment
                    const { hasSufficientFunds, balance } = await checkBalance(
                        provider,
                        userAddress.address
                    );

                    if (hasSufficientFunds) {
                        console.log(
                            `[DEBUG] Deploying Starknet account ${userAddress.address}...`
                        );

                        try {
                            // Deploy the account
                            await deployStrkWallet(
                                provider,
                                privateKey,
                                publicKey,
                                userAddress.address,
                                false // Skip balance check since we already did it
                            );

                            isDeployed = true;
                            console.log(
                                `[SUCCESS] Starknet account ${userAddress.address} deployed successfully`
                            );

                            // Create notification for deployment
                            await AppDataSource.getRepository(
                                Notification
                            ).save({
                                userId: req.user.id,
                                type: NotificationType.DEPOSIT,
                                title: 'Starknet Account Deployed',
                                message: `Your Starknet ${network} account has been successfully deployed at ${userAddress.address}`,
                                details: {
                                    address: userAddress.address,
                                    chain: 'starknet',
                                    network: network,
                                    balance: balance,
                                },
                                isRead: false,
                                createdAt: new Date(),
                            });
                        } catch (deployError) {
                            throw new Error(
                                `Failed to deploy Starknet account: ${
                                    deployError instanceof Error
                                        ? deployError.message
                                        : String(deployError)
                                }`
                            );
                        }
                    } else {
                        throw new Error(
                            `Starknet account not deployed and insufficient funds for deployment. Current balance: ${balance}`
                        );
                    }
                }

                if (!isDeployed) {
                    throw new Error(
                        'Starknet account must be deployed before sending transactions'
                    );
                }

                // Create Account instance for sending transactions
                const account = new Account(
                    provider,
                    userAddress.address,
                    privateKey
                );

                // Determine which token to send (ETH or STRK)
                // For simplicity, we'll send ETH on Starknet by default
                // You can modify this to support STRK token transfers as well
                const ethTokenAddress =
                    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
                const strkTokenAddress =
                    '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

                // Use STRK token by default, you can add logic to choose between ETH/STRK
                const tokenAddress = strkTokenAddress;

                // Convert amount to uint256 (18 decimals for STRK/ETH)
                const amountInWei = uint256.bnToUint256(
                    BigInt(Math.floor(Number(amount) * 1e18))
                );

                // Call the transfer function on the token contract
                const transferCall = {
                    contractAddress: tokenAddress,
                    entrypoint: 'transfer',
                    calldata: [toAddress, amountInWei.low, amountInWei.high],
                };

                console.log(
                    `[DEBUG] Sending ${amount} STRK from ${userAddress.address} to ${toAddress}`
                );

                try {
                    const result = await account.execute(transferCall);
                    txHash = result.transaction_hash;

                    console.log(
                        `[SUCCESS] Starknet transaction sent: ${txHash}`
                    );

                    // Wait for transaction confirmation (optional but recommended)
                    await provider.waitForTransaction(txHash);
                    console.log(
                        `[SUCCESS] Starknet transaction confirmed: ${txHash}`
                    );
                } catch (executeError) {
                    throw new Error(
                        `Failed to execute Starknet transaction: ${
                            executeError instanceof Error
                                ? executeError.message
                                : String(executeError)
                        }`
                    );
                }
            }
            // POLKADOT
            else if (chain === 'polkadot') {
                try {
                    // dynamic require to avoid hard dependency at load time
                    // @ts-ignore
                    const { ApiPromise, WsProvider } = require('@polkadot/api');
                    // @ts-ignore
                    const { Keyring } = require('@polkadot/keyring');

                    const wsUrl = network === 'testnet'
                        ? (process.env.POLKADOT_WS_TESTNET || 'wss://pas-rpc.stakeworld.io')
                        : (process.env.POLKADOT_WS_MAINNET || 'wss://rpc.polkadot.io');

                    const provider = new WsProvider(wsUrl);
                    const api = await ApiPromise.create({ provider });

                    const keyring = new Keyring({ type: 'sr25519' });

                    // Try several private key formats: URI/mnemonic (addFromUri), raw 32-byte seed (addFromSeed)
                    let sender: any = null;
                    let derivedAddress: string | null = null;
                    const pkStr = typeof privateKey === 'string' ? privateKey : String(privateKey);

                    // Try addFromUri (handles mnemonics, <//Alice> style URIs, and raw seed URIs)
                    try {
                        sender = keyring.addFromUri(pkStr);
                        derivedAddress = sender.address;
                    } catch (e) {
                        // Not a URI/mnemonic, try as 32-byte hex seed
                        try {
                            const seedHex = pkStr.replace(/^0x/, '');
                            if (seedHex.length === 64) {
                                const seed = Buffer.from(seedHex, 'hex');
                                sender = keyring.addFromSeed(seed);
                                derivedAddress = sender.address;
                            } else {
                                throw new Error('Private key is not a valid 32-byte hex seed');
                            }
                        } catch (e2) {
                            // give up and show helpful message
                            try { await api.disconnect(); } catch {}
                            throw new Error('Unsupported Polkadot private key format. Expected mnemonic/URI or 32-byte hex seed. Errors: ' + [String(e), String(e2)].filter(Boolean).join(' | '));
                        }
                    }

                    // Verify the derived address matches the stored address (safety check)
                    if (!derivedAddress) {
                        try { await api.disconnect(); } catch {}
                        throw new Error('Failed to derive address from provided private key');
                    }
                    if (derivedAddress !== userAddress.address) {
                        // If the encoded SS58 address differs we may still have the same public key
                        try {
                            // @ts-ignore
                            const { decodeAddress, encodeAddress } = require('@polkadot/util-crypto');
                            let storedPub: Uint8Array | null = null;
                            try {
                                storedPub = decodeAddress(userAddress.address);
                            } catch (decErr) {
                                storedPub = null;
                            }

                            const derivedPub: Uint8Array = sender && sender.publicKey ? sender.publicKey : (sender && sender?.pair && sender.pair.publicKey) || null;

                            if (storedPub && derivedPub && Buffer.from(storedPub).toString('hex') === Buffer.from(derivedPub).toString('hex')) {
                                // Same public key, different SS58 encoding. Try to detect ss58 format used by stored address for logging.
                                let detectedFormat: number | null = null;
                                for (let fmt = 0; fmt < 64; fmt++) {
                                    try {
                                        const enc = encodeAddress(derivedPub, fmt);
                                        if (enc === userAddress.address) {
                                            detectedFormat = fmt;
                                            break;
                                        }
                                    } catch {}
                                }

                                console.warn(`[WARN] Polkadot address encoding mismatch: derived address ${derivedAddress} !== stored ${userAddress.address}, but public keys match. Detected ss58Format=${detectedFormat}`);
                                // Proceed — signing is based on the keypair (public key matches), encoding differences are harmless for signing.
                            } else {
                                // If forceSend is true, allow operator override (dangerous) — otherwise abort
                                if (forceSend) {
                                    console.warn(`[FORCE] Proceeding despite derived/stored address mismatch. Derived=${derivedAddress} Stored=${userAddress.address}`);
                                } else {
                                    try { await api.disconnect(); } catch {}
                                    throw new Error(`Derived address ${derivedAddress} does not match stored address ${userAddress.address}. Aborting to prevent funds loss.`);
                                }
                            }
                        } catch (errCompare) {
                            try { await api.disconnect(); } catch {}
                            throw new Error(`Derived address ${derivedAddress} does not match stored address ${userAddress.address}. Additionally, address-compare failed: ${String(errCompare)}`);
                        }
                    }

                    // Convert amount DOT -> Planck (1 DOT = 10^10 Planck)
                    const planck = BigInt(Math.round(Number(amount) * 1e10));

                    // choose available transfer method
                    let tx: any = null;
                    if (api.tx && api.tx.balances && api.tx.balances.transfer) {
                        tx = api.tx.balances.transfer(toAddress, planck.toString());
                    } else if (api.tx && api.tx.balances && api.tx.balances.transferKeepAlive) {
                        tx = api.tx.balances.transferKeepAlive(toAddress, planck.toString());
                    } else {
                        // Provide helpful debug information about available tx modules
                        const modules = Object.keys(api.tx || {}).join(', ');
                        try { await api.disconnect(); } catch {}
                        throw new Error(`No balances.transfer method found on chain. Available tx modules: ${modules}`);
                    }

                    // Attempt to sign and send; on fee-related failure, include account balance in diagnostics
                    try {
                        // signAndSend without callback returns the HashPromise
                        const result = await tx.signAndSend(sender);
                        txHash = result?.toString ? result.toString() : String(result);
                    } catch (sendErr: any) {
                        // If fees cannot be paid, fetch account balances for diagnostics
                        let accountInfoStr = '';
                        try {
                            const info = await api.query.system.account(userAddress.address);
                            const free = info.data?.free?.toString?.() ?? info.data?.free ?? 'unknown';
                            const reserved = info.data?.reserved?.toString?.() ?? '0';
                            accountInfoStr = `account.free=${free}, account.reserved=${reserved}`;
                        } catch (qerr) {
                            accountInfoStr = 'failed to query account info: ' + String(qerr);
                        }

                        try { await api.disconnect(); } catch {}
                        throw new Error(`Failed to send DOT: ${(sendErr && sendErr.message) || sendErr}. ${accountInfoStr}`);
                    }

                    try { await api.disconnect(); } catch {}
                } catch (err) {
                    console.error('Polkadot send error:', err);
                    throw new Error(((err as any) && (err as any).message) || String(err));
                }
            }
            // XLM / Stellar
            else if (chain === 'stellar') {
                try {
                    // @ts-ignore
                    const StellarSdk = require('stellar-sdk');
                    const horizonUrl = network === 'testnet'
                        ? 'https://horizon-testnet.stellar.org'
                        : 'https://horizon.stellar.org';

                    const server = new StellarSdk.Server(horizonUrl);
                    const sourceKeypair = StellarSdk.Keypair.fromSecret(privateKey);

                    // Load account
                    const account = await server.loadAccount(sourceKeypair.publicKey());

                    const fee = await server.fetchBaseFee();
                    const networkPassphrase = network === 'testnet' ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;

                    const txBuilder = new StellarSdk.TransactionBuilder(account, {
                        fee: String(fee),
                        networkPassphrase,
                    })
                        .addOperation(StellarSdk.Operation.payment({
                            destination: toAddress,
                            asset: StellarSdk.Asset.native(),
                            amount: String(amount),
                        }))
                        .setTimeout(30);

                    const tx = txBuilder.build();
                    tx.sign(sourceKeypair);

                    const resp = await server.submitTransaction(tx);
                    txHash = resp.hash;
                } catch (err) {
                    console.error('Stellar send error:', err);
                    throw new Error('Failed to send XLM: ' + (((err as any) && (err as any).message) || err));
                }
            }
            // BTC
            else if (chain === 'bitcoin') {
                console.log('[DEBUG] Bitcoin transaction start');
                console.log('[DEBUG] Bitcoin address:', userAddress.address);

                if (!privateKey) {
                    throw new Error(
                        'Private key is undefined after decryption'
                    );
                }

                let privateKeyStr =
                    typeof privateKey === 'string'
                        ? privateKey
                        : String(privateKey);

                // Fetch UTXOs
                const apiUrl =
                    network === 'testnet'
                        ? `https://blockstream.info/testnet/api/address/${userAddress.address}/utxo`
                        : `https://blockstream.info/api/address/${userAddress.address}/utxo`;

                console.log('[DEBUG] Fetching UTXOs from:', apiUrl);

                let utxos;
                try {
                    const utxoResponse = await axios.get(apiUrl);
                    utxos = utxoResponse.data;
                    console.log(
                        '[DEBUG] Raw UTXO response:',
                        JSON.stringify(utxos, null, 2)
                    );
                } catch (utxoError) {
                    throw new Error(
                        `Failed to fetch UTXOs: ${
                            utxoError instanceof Error
                                ? utxoError.message
                                : String(utxoError)
                        }`
                    );
                }

                if (!Array.isArray(utxos) || utxos.length === 0) {
                    throw new Error('No UTXOs available for this address');
                }

                // Filter confirmed UTXOs
                const confirmedUtxos = utxos.filter(
                    (utxo: any) => utxo.status?.confirmed === true
                );
                console.log('[DEBUG] Confirmed UTXOs:', confirmedUtxos.length);

                if (confirmedUtxos.length === 0) {
                    throw new Error('No confirmed UTXOs available');
                }

                const networkParams =
                    network === 'testnet'
                        ? bitcoin.networks.testnet
                        : bitcoin.networks.bitcoin;
                const psbt = new bitcoin.Psbt({ network: networkParams });

                let inputSum = 0;
                let addedInputs = 0;
                const targetAmount = Math.round(Number(amount) * 1e8);
                const estimatedFee = 1000;

                console.log(
                    '[DEBUG] Target:',
                    targetAmount,
                    'Fee:',
                    estimatedFee,
                    'Total needed:',
                    targetAmount + estimatedFee
                );

                // Create keypair first
                let keyPair;
                try {
                    keyPair = ECPair.fromWIF(privateKeyStr, networkParams);
                    console.log('[DEBUG] Loaded keypair from WIF');
                } catch {
                    const cleanHex = privateKeyStr.startsWith('0x')
                        ? privateKeyStr.slice(2)
                        : privateKeyStr;
                    if (cleanHex.length !== 64) {
                        throw new Error(
                            `Invalid hex private key length: ${cleanHex.length}, expected 64`
                        );
                    }
                    const buffer = Buffer.from(cleanHex, 'hex');
                    keyPair = ECPair.fromPrivateKey(buffer, {
                        network: networkParams,
                    });
                    console.log('[DEBUG] Loaded keypair from hex');
                }

                // Process each confirmed UTXO
                for (const utxo of confirmedUtxos) {
                    try {
                        console.log(
                            `[DEBUG] Processing UTXO: ${utxo.txid}:${utxo.vout}, value: ${utxo.value}`
                        );

                        // Get full transaction data
                        const txUrl =
                            network === 'testnet'
                                ? `https://blockstream.info/testnet/api/tx/${utxo.txid}`
                                : `https://blockstream.info/api/tx/${utxo.txid}`;

                        const txResp = await axios.get(txUrl);
                        const txData = txResp.data as {
                            vout: Array<{
                                scriptpubkey: string;
                                scriptpubkey_type: string;
                                value: number;
                            }>;
                        };

                        const output = txData.vout[utxo.vout];
                        if (!output) {
                            console.log(
                                `[DEBUG] Output ${utxo.vout} not found`
                            );
                            continue;
                        }

                        console.log(
                            `[DEBUG] Output type:`,
                            output.scriptpubkey_type
                        );

                        const scriptHex = output.scriptpubkey;
                        if (!scriptHex) {
                            console.log(`[DEBUG] Missing scriptpubkey`);
                            continue;
                        }

                        // Add input based on type
                        if (output.scriptpubkey_type === 'v0_p2wpkh') {
                            // SegWit input
                            psbt.addInput({
                                hash: utxo.txid,
                                index: utxo.vout,
                                witnessUtxo: {
                                    script: Buffer.from(scriptHex, 'hex'),
                                    value: utxo.value,
                                },
                            });
                            console.log('[DEBUG] Added SegWit input');
                        } else if (output.scriptpubkey_type === 'p2pkh') {
                            // Legacy P2PKH input - needs full transaction hex
                            const txHexUrl =
                                network === 'testnet'
                                    ? `https://blockstream.info/testnet/api/tx/${utxo.txid}/hex`
                                    : `https://blockstream.info/api/tx/${utxo.txid}/hex`;

                            const txHexResp = await axios.get(txHexUrl);
                            const txHex = txHexResp.data as string;

                            psbt.addInput({
                                hash: utxo.txid,
                                index: utxo.vout,
                                nonWitnessUtxo: Buffer.from(txHex, 'hex'),
                            });
                            console.log('[DEBUG] Added P2PKH input');
                        } else {
                            console.log(
                                `[DEBUG] Unsupported script type: ${output.scriptpubkey_type}`
                            );
                            continue;
                        }

                        inputSum += utxo.value;
                        addedInputs++;

                        console.log(
                            `[DEBUG] Added input ${addedInputs}, total: ${inputSum} satoshis`
                        );

                        // Check if we have enough
                        if (inputSum >= targetAmount + estimatedFee) {
                            console.log('[DEBUG] Sufficient inputs collected');
                            break;
                        }

                        // Save transaction details to the database
                        await AppDataSource.getRepository(Transaction).save({
                            userId: req.user.id,
                            type: 'send',
                            amount,
                            chain: chain,
                            network: network, // ✅ Add network field
                            toAddress,
                            fromAddress: userAddress.address,
                            txHash,
                            status: 'confirmed',
                            createdAt: new Date(),
                        });

                        // Create a notification for the sent transaction
                        await AppDataSource.getRepository(Notification).save({
                            userId: req.user.id,
                            type: NotificationType.SEND,
                            title: 'Tokens Sent',
                            message: `You sent ${amount} ${chain.toUpperCase()} to ${toAddress}`,
                            details: {
                                amount,
                                chain,
                                network, // ✅ Add network to notification details
                                toAddress,
                                fromAddress: userAddress.address,
                                txHash,
                            },
                            isRead: false,
                            createdAt: new Date(),
                        });
                    } catch (error) {
                        console.error(
                            `[DEBUG] Error processing UTXO ${utxo.txid}:${utxo.vout}:`,
                            error
                        );
                        continue;
                    }
                }

                if (addedInputs === 0) {
                    throw new Error(
                        'No valid UTXOs could be added to transaction'
                    );
                }

                if (inputSum < targetAmount + estimatedFee) {
                    throw new Error(
                        `Insufficient balance. Have: ${
                            inputSum / 1e8
                        } BTC, Need: ${(targetAmount + estimatedFee) / 1e8} BTC`
                    );
                }

                // Add outputs
                psbt.addOutput({
                    address: toAddress,
                    value: targetAmount,
                });

                const change = inputSum - targetAmount - estimatedFee;
                if (change > 0) {
                    console.log(`[DEBUG] Adding change: ${change} satoshis`);
                    psbt.addOutput({
                        address: userAddress.address,
                        value: change,
                    });
                }

                // Sign all inputs
                // Replace the Bitcoin signing section (around lines 760-790) with this fixed version:

                // Sign all inputs
                console.log('[DEBUG] Signing inputs...');
                try {
                    // Create a compatible signer wrapper that converts Uint8Array to Buffer
                    const signer = {
                        publicKey: Buffer.from(keyPair.publicKey),
                        sign: (hash: Buffer, lowR?: boolean) => {
                            const signature = keyPair.sign(hash, lowR);
                            return Buffer.from(signature);
                        },
                        network: keyPair.network,
                        compressed: keyPair.compressed,
                        privateKey: keyPair.privateKey,
                    };

                    for (let i = 0; i < addedInputs; i++) {
                        psbt.signInput(i, signer);
                        console.log(`[DEBUG] Signed input ${i}`);
                    }
                } catch (signError) {
                    console.error('[DEBUG] Signing error:', signError);
                    throw new Error(
                        `Failed to sign inputs: ${
                            signError instanceof Error
                                ? signError.message
                                : String(signError)
                        }`
                    );
                }

                // Validate signatures
                console.log('[DEBUG] Validating signatures...');
                const validated = psbt.validateSignaturesOfAllInputs(
                    (pubkey, msghash, signature) => {
                        return ECPair.fromPublicKey(pubkey, {
                            network: networkParams,
                        }).verify(msghash, signature);
                    }
                );

                if (!validated) {
                    throw new Error('Signature validation failed');
                }
                console.log('[DEBUG] All signatures validated');

                // Finalize
                psbt.finalizeAllInputs();
                console.log('[DEBUG] Inputs finalized');

                const rawTx = psbt.extractTransaction().toHex();
                const broadcastUrl =
                    network === 'testnet'
                        ? 'https://blockstream.info/testnet/api/tx'
                        : 'https://blockstream.info/api/tx';

                console.log('[DEBUG] Broadcasting transaction...');
                const resp = await axios.post(broadcastUrl, rawTx, {
                    headers: { 'Content-Type': 'text/plain' },
                });

                txHash = resp.data as string;
                console.log(
                    '[DEBUG] Transaction broadcast successful:',
                    txHash
                );
            }

            // Save transaction details to the database
            await AppDataSource.getRepository(Transaction).save({
                userId: req.user.id,
                type: 'send',
                amount,
                chain: chain,
                network: network,
                toAddress,
                fromAddress: userAddress.address,
                txHash,
                status: 'confirmed',
                createdAt: new Date(),
            });

            // Create a notification for the sent transaction
            await AppDataSource.getRepository(Notification).save({
                userId: req.user.id,
                type: NotificationType.SEND,
                title: 'Tokens Sent',
                message: `You sent ${amount} ${chain.toUpperCase()} to ${toAddress}`,
                details: {
                    amount,
                    chain,
                    network,
                    toAddress,
                    fromAddress: userAddress.address,
                    txHash,
                },
                isRead: false,
                createdAt: new Date(),
            });

            res.status(200).json({
                message: 'Transaction sent successfully',
                txHash,
                amount,
                fromAddress: userAddress.address,
                toAddress,
                chain,
                network,
            });
        } catch (error) {
            console.error('Send transaction error:', error);
            res.status(500).json({
                error: 'Failed to send transaction',
                details: error instanceof Error ? error.message : String(error),
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

            // Sort addresses before sending
            const sortedAddresses =
                sortAddressesByChainOrder(simplifiedAddresses);

            res.status(200).json({
                message: 'Testnet addresses retrieved successfully',
                addresses: sortedAddresses,
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
                            nodeUrl: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`,
                        });

                        const strkTokenAddress =
                            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

                        const result = await provider.callContract({
                            contractAddress: strkTokenAddress,
                            entrypoint: 'balanceOf',
                            calldata: [addr.address],
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
                        const provider = new ethers.JsonRpcProvider(
                            `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
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
                        const response = await axios.get(
                            `https://blockstream.info/testnet/api/address/${addr.address}`
                        );
                        const balanceInSatoshis =
                            (response.data as any).chain_stats
                                ?.funded_txo_sum || 0;
                        const balanceInBTC = balanceInSatoshis / 100000000;

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
                        const connection = new Connection(
                            `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                        );
                        const publicKey = new PublicKey(addr.address);
                        const balance = await connection.getBalance(publicKey);
                        const balanceInSOL = balance / 1000000000;

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
                } else if (addr.chain === 'stellar') {
                    try {
                        const horizon = 'https://horizon-testnet.stellar.org';
                        const resp = await axios.get(
                            `${horizon}/accounts/${addr.address}`
                        );
                        const data = resp.data as any;
                        const native = (data.balances || []).find((b: any) => b.asset_type === 'native');
                        const balanceStr = native ? native.balance : '0';
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: balanceStr,
                            symbol: 'XLM',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'XLM',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'polkadot') {
                    try {
                        // Directly create a short-lived ApiPromise using the Paseo/testnet endpoint
                        // @ts-ignore dynamic require
                        const { ApiPromise, WsProvider } = require('@polkadot/api');
                        const wsUrl = process.env.POLKADOT_WS_TESTNET || 'wss://pas-rpc.stakeworld.io';
                        const provider = new WsProvider(wsUrl);
                        const api = await ApiPromise.create({ provider });

                        const derived = await api.derive.balances.account(addr.address);
                        const available = (derived && (derived.availableBalance ?? derived.freeBalance ?? derived.free)) || 0;
                        const PLANCK = BigInt(10 ** 10);
                        const availableBig = BigInt(String(available));
                        const dot = (availableBig / PLANCK).toString();

                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: dot,
                            symbol: 'DOT',
                        });

                        try { await api.disconnect(); } catch {}
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'testnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'DOT',
                            error: 'Failed to fetch balance',
                        });
                    }
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
                        const provider = new RpcProvider({
                            nodeUrl: `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`,
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
                        const provider = new ethers.JsonRpcProvider(
                            `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
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
                        const response = await axios.get(
                            `https://blockstream.info/api/address/${addr.address}`
                        );
                        const balanceInSatoshis =
                            (response.data as any).chain_stats
                                ?.funded_txo_sum || 0;
                        const balanceInBTC = balanceInSatoshis / 100000000;

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
                        const connection = new Connection(
                            `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                        );
                        const publicKey = new PublicKey(addr.address);
                        const balance = await connection.getBalance(publicKey);
                        const balanceInSOL = balance / 1000000000;

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
                } else if (addr.chain === 'stellar') {
                    try {
                        const horizon = 'https://horizon.stellar.org';
                        const resp = await axios.get(`${horizon}/accounts/${addr.address}`);
                        const data = resp.data as any;
                        const native = (data.balances || []).find((b: any) => b.asset_type === 'native');
                        const balanceStr = native ? native.balance : '0';
                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: balanceStr,
                            symbol: 'XLM',
                        });
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'XLM',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (addr.chain === 'polkadot') {
                    try {
                        // @ts-ignore dynamic require
                        const { ApiPromise, WsProvider } = require('@polkadot/api');
                        const wsUrl = process.env.POLKADOT_WS_MAINNET || 'wss://rpc.polkadot.io';
                        const provider = new WsProvider(wsUrl);
                        const api = await ApiPromise.create({ provider });

                        const derived = await api.derive.balances.account(addr.address);
                        const available = (derived && (derived.availableBalance ?? derived.freeBalance ?? derived.free)) || 0;
                        const PLANCK = BigInt(10 ** 10);
                        const availableBig = BigInt(String(available));
                        const dot = (availableBig / PLANCK).toString();

                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: dot,
                            symbol: 'DOT',
                        });

                        try { await api.disconnect(); } catch {}
                    } catch (error) {
                        balances.push({
                            chain: addr.chain,
                            network: 'mainnet',
                            address: addr.address,
                            balance: '0',
                            symbol: 'DOT',
                            error: 'Failed to fetch balance',
                        });
                    }
                } else if (
                    addr.chain === 'usdt_erc20' ||
                    addr.chain === 'usdt_trc20'
                ) {
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
                            ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                            : `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
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
                            ? `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                            : `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                    );
                    const publicKey = new PublicKey(addr.address);
                    const balance = await connection.getBalance(publicKey);
                    currentBalance = balance / 1e9;
                } else if (addr.chain === 'starknet') {
                    // Skip Starknet for now due to RPC issues
                    console.log(
                        'Skipping Starknet deposit check due to RPC issues'
                    );
                    continue;
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

//// Helper function
function sortAddressesByChainOrder(addresses: any[]): any[] {
    const order = ['eth', 'btc', 'sol', 'strk', 'usdterc20', 'usdttrc20'];
    const normalize = (chain: string) => {
        switch (chain) {
            case 'ethereum':
                return 'eth';
            case 'bitcoin':
                return 'btc';
            case 'solana':
                return 'sol';
            case 'starknet':
                return 'strk';
            case 'usdt_erc20':
                return 'usdterc20';
            case 'usdt_trc20':
                return 'usdttrc20';
            default:
                return chain;
        }
    };
    return addresses.sort(
        (a, b) =>
            order.indexOf(normalize(a.chain)) -
            order.indexOf(normalize(b.chain))
    );
}
