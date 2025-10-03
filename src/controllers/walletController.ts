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
import * as ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
const ECPair = ECPairFactory.ECPairFactory(ecc);
import axios from 'axios';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { AppDataSource } from '../config/database';
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
                    console.log(
                        `[DEBUG] Checking BTC balance for address: ${addr.address}`
                    );
                    console.log(`[DEBUG] Network: ${addr.network}`);
                    console.log(
                        `[DEBUG] Expected address: mymoYSk7wH2cSCJRNDfmMj8t3CTE1X87aK`
                    );

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
                        console.log(
                            `[DEBUG] Funded: ${data.chain_stats.funded_txo_sum} satoshis`
                        );
                        console.log(
                            `[DEBUG] Spent: ${data.chain_stats.spent_txo_sum} satoshis`
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
                    console.log(
                        `[DEBUG] Checking BTC balance for address: ${addr.address}`
                    );
                    console.log(`[DEBUG] Network: ${addr.network}`);
                    console.log(
                        `[DEBUG] Expected address: mymoYSk7wH2cSCJRNDfmMj8t3CTE1X87aK`
                    );

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
            // STRK (Starknet) with auto-deployment
            // else if (chain === 'starknet') {
            //     // Validate toAddress
            //     const toAddr = padStarknetAddress(toAddress);
            //     if (!/^0x[0-9a-fA-F]{64}$/.test(toAddr)) {
            //         res.status(400).json({
            //             error: 'Invalid Starknet address after padding.',
            //         });
            //         return;
            //     }

            //     const provider = new RpcProvider({
            //         nodeUrl:
            //             network === 'testnet'
            //                 ? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI'
            //                 : 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/CP1fRkzqgL_nwb9DNNiKI',
            //     });

            //     const fromAddr = padStarknetAddress(userAddress.address);

            //     // Check if account is deployed
            //     let isDeployed = false;
            //     try {
            //         await provider.getClassHashAt(fromAddr);
            //         isDeployed = true;
            //     } catch {
            //         isDeployed = false;
            //     }

            //     // Prepare private key for Starknet.js
            //     let starknetPrivateKey: string;
            //     if (Buffer.isBuffer(privateKey)) {
            //         starknetPrivateKey = '0x' + privateKey.toString('hex');
            //     } else if (
            //         typeof privateKey === 'string' &&
            //         !privateKey.startsWith('0x')
            //     ) {
            //         try {
            //             const buf = Buffer.from(privateKey, 'base64');
            //             starknetPrivateKey = '0x' + buf.toString('hex');
            //         } catch {
            //             starknetPrivateKey = privateKey;
            //         }
            //     } else {
            //         starknetPrivateKey = privateKey;
            //     }

            //     console.log(
            //         '[DEBUG] Decrypted privateKey:',
            //         privateKey,
            //         typeof privateKey
            //     );
            //     console.log(
            //         '[DEBUG] Using starknetPrivateKey:',
            //         starknetPrivateKey
            //     );

            //     // Auto-deploy if needed
            //     if (!isDeployed) {
            //         console.log(
            //             `[INFO] Deploying Starknet account: ${fromAddr} using paymaster`
            //         );

            //         // Paymaster config for Sepolia
            //         const paymasterAddress =
            //             '0x06106B7472A8991F60EDf9e3b4738AE6dBfE6882410403aA3f4381B9B14E7032';
            //         const paymasterPrivateKey =
            //             '0x05bff331a0bc5f346c2b098ec243e62491dc9f4104a8d2093881bffdb0674251';

            //         // Prepare deploy payload for the user's account
            //         const publicKey =
            //             ec.starkCurve.getStarkKey(starknetPrivateKey);
            //         const OZ_ACCOUNT_CLASS_HASH =
            //             '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';
            //         const deployPayload = {
            //             classHash: OZ_ACCOUNT_CLASS_HASH,
            //             constructorCalldata: [publicKey],
            //             addressSalt: publicKey,
            //         };

            //         // Use paymaster account to deploy
            //         const paymasterAccount = new Account(
            //             provider,
            //             paymasterAddress,
            //             paymasterPrivateKey
            //         );
            //         try {
            //             const { transaction_hash } =
            //                 await paymasterAccount.deployAccount(deployPayload);
            //             await provider.waitForTransaction(transaction_hash);
            //             console.log(
            //                 `[INFO] Account deployed successfully by paymaster: ${transaction_hash}`
            //             );
            //         } catch (deployError) {
            //             res.status(400).json({
            //                 error: 'Account deployment by paymaster failed. Ensure paymaster has enough STRK for gas fees.',
            //                 details:
            //                     deployError instanceof Error
            //                         ? deployError.message
            //                         : String(deployError),
            //             });
            //             return;
            //         }
            //     }

            //     // Proceed with transfer
            //     const account = new Account(
            //         provider,
            //         fromAddr,
            //         starknetPrivateKey
            //     );
            //     const tokenAddress =
            //         '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
            //     const amountStr =
            //         typeof amount === 'string' ? amount : String(amount);
            //     const amountWei = BigInt(Math.floor(Number(amountStr) * 1e18));
            //     const amountUint256 = uint256.bnToUint256(amountWei);

            //     // Ensure calldata values are strings
            //     const low = amountUint256.low.toString();
            //     const high = amountUint256.high.toString();

            //     const tx = await account.execute({
            //         contractAddress: tokenAddress,
            //         entrypoint: 'transfer',
            //         calldata: [toAddr, low, high],
            //     });
            //     txHash = tx.transaction_hash;
            // }

            // BTC
            else if (chain === 'bitcoin') {
                console.log('[DEBUG] Bitcoin transaction start');
                console.log(
                    '[DEBUG] Decrypted private key:',
                    privateKey,
                    typeof privateKey
                );

                if (!privateKey) {
                    throw new Error(
                        'Private key is undefined after decryption'
                    );
                }

                let privateKeyStr =
                    typeof privateKey === 'string'
                        ? privateKey
                        : String(privateKey);
                console.log('[DEBUG] Private key as string:', privateKeyStr);

                const apiUrl =
                    network === 'testnet'
                        ? `https://blockstream.info/testnet/api/address/${userAddress.address}/utxo`
                        : `https://blockstream.info/api/address/${userAddress.address}/utxo`;

                console.log('[DEBUG] Fetching UTXOs from:', apiUrl);

                const utxos = (await axios.get(apiUrl)).data as Array<{
                    txid: string;
                    vout: number;
                    value: number;
                    status?: any;
                    scriptpubkey?: string;
                }>;

                console.log('[DEBUG] Found UTXOs:', utxos.length);
                console.log(
                    '[DEBUG] UTXO details:',
                    JSON.stringify(utxos, null, 2)
                );

                if (utxos.length === 0) {
                    throw new Error('No UTXOs available for this address');
                }

                // Filter for confirmed UTXOs only
                const confirmedUtxos = utxos.filter(
                    (utxo) => utxo.status?.confirmed
                );
                console.log('[DEBUG] Confirmed UTXOs:', confirmedUtxos.length);

                if (confirmedUtxos.length === 0) {
                    throw new Error(
                        'No confirmed UTXOs available. Please wait for your previous transactions to confirm.'
                    );
                }

                const networkParams =
                    network === 'testnet'
                        ? bitcoin.networks.testnet
                        : bitcoin.networks.bitcoin;
                const psbt = new bitcoin.Psbt({ network: networkParams });

                let inputSum = 0;
                let addedInputs = 0;
                const targetAmount = Math.round(Number(amount) * 1e8);
                const estimatedFee = 1000; // 1000 satoshis fee

                for (const utxo of confirmedUtxos) {
                    console.log('[DEBUG] Processing confirmed UTXO:', {
                        txid: utxo.txid,
                        vout: utxo.vout,
                        value: utxo.value,
                        confirmed: utxo.status?.confirmed,
                    });

                    try {
                        // Get the full transaction details
                        const txUrl =
                            network === 'testnet'
                                ? `https://blockstream.info/testnet/api/tx/${utxo.txid}`
                                : `https://blockstream.info/api/tx/${utxo.txid}`;

                        console.log(
                            '[DEBUG] Fetching transaction from:',
                            txUrl
                        );
                        const txResp = await axios.get(txUrl);
                        const txData = txResp.data as {
                            vout: Array<{
                                value: number;
                                scriptpubkey_hex: string;
                                scriptpubkey_type: string;
                                scriptpubkey_address?: string;
                            }>;
                        };

                        // Get the specific output
                        const output = txData.vout[utxo.vout];
                        if (!output) {
                            console.log(
                                '[DEBUG] Skipping UTXO - output not found at index',
                                utxo.vout
                            );
                            continue;
                        }

                        if (!output.scriptpubkey_hex) {
                            console.log(
                                '[DEBUG] Skipping UTXO - missing scriptpubkey_hex'
                            );
                            continue;
                        }

                        console.log('[DEBUG] Output details:', {
                            value: output.value,
                            scriptpubkey_hex: output.scriptpubkey_hex,
                            scriptpubkey_type: output.scriptpubkey_type,
                            scriptpubkey_address: output.scriptpubkey_address,
                        });

                        // Verify the output value matches the UTXO value
                        const outputValueSatoshis = Math.round(
                            output.value * 1e8
                        );
                        if (outputValueSatoshis !== utxo.value) {
                            console.log('[DEBUG] Value mismatch:', {
                                utxoValue: utxo.value,
                                outputValue: outputValueSatoshis,
                            });
                            // Use the UTXO value as it's more reliable
                        }

                        // Add the input to PSBT
                        psbt.addInput({
                            hash: utxo.txid,
                            index: utxo.vout,
                            witnessUtxo: {
                                script: Buffer.from(
                                    output.scriptpubkey_hex,
                                    'hex'
                                ),
                                value: utxo.value, // Use UTXO value
                            },
                        });

                        inputSum += utxo.value;
                        addedInputs++;

                        console.log('[DEBUG] Successfully added input:', {
                            inputSum,
                            addedInputs,
                            target: targetAmount + estimatedFee,
                            remaining: targetAmount + estimatedFee - inputSum,
                        });

                        // Check if we have enough for the transaction + fee
                        if (inputSum >= targetAmount + estimatedFee) {
                            console.log('[DEBUG] Sufficient inputs collected');
                            break;
                        }
                    } catch (inputError) {
                        console.log('[DEBUG] Error processing UTXO:', {
                            txid: utxo.txid,
                            vout: utxo.vout,
                            error:
                                inputError instanceof Error
                                    ? inputError.message
                                    : String(inputError),
                        });
                        continue; // Skip this UTXO and try the next one
                    }
                }

                if (addedInputs === 0) {
                    throw new Error(
                        'No valid UTXOs found for this transaction. All UTXOs may be unconfirmed or invalid.'
                    );
                }

                if (inputSum < targetAmount + estimatedFee) {
                    throw new Error(
                        `Insufficient BTC balance. Have: ${
                            inputSum / 1e8
                        } BTC, Need: ${
                            (targetAmount + estimatedFee) / 1e8
                        } BTC (including ${estimatedFee / 1e8} BTC fee)`
                    );
                }

                console.log('[DEBUG] Adding outputs...');

                // Add output to recipient
                psbt.addOutput({
                    address: toAddress,
                    value: targetAmount,
                });

                // Add change output if necessary
                const change = inputSum - targetAmount - estimatedFee;
                if (change > 0) {
                    console.log(
                        '[DEBUG] Adding change output:',
                        change,
                        'satoshis'
                    );
                    psbt.addOutput({
                        address: userAddress.address,
                        value: change,
                    });
                } else {
                    console.log('[DEBUG] No change needed');
                }

                console.log('[DEBUG] Creating keypair...');

                // Create keypair from private key
                let keyPair;
                try {
                    // Try WIF format first
                    keyPair = ECPair.fromWIF(privateKeyStr, networkParams);
                    console.log(
                        '[DEBUG] Successfully created keypair from WIF'
                    );
                } catch (wifError) {
                    console.log('[DEBUG] WIF failed, trying hex format...');
                    try {
                        // Try hex format
                        const cleanHex = privateKeyStr.startsWith('0x')
                            ? privateKeyStr.slice(2)
                            : privateKeyStr;

                        if (cleanHex.length !== 64) {
                            throw new Error(
                                `Invalid hex length: ${cleanHex.length}, expected 64`
                            );
                        }

                        const buffer = Buffer.from(cleanHex, 'hex');
                        keyPair = ECPair.fromPrivateKey(buffer, {
                            network: networkParams,
                        });
                        console.log(
                            '[DEBUG] Successfully created keypair from hex'
                        );
                    } catch (hexError) {
                        throw new Error(
                            `Invalid Bitcoin private key format. WIF error: ${
                                wifError instanceof Error
                                    ? wifError.message
                                    : String(wifError)
                            }, Hex error: ${
                                hexError instanceof Error
                                    ? hexError.message
                                    : String(hexError)
                            }`
                        );
                    }
                }

                if (!keyPair) {
                    throw new Error('Failed to create Bitcoin keypair');
                }

                console.log('[DEBUG] Signing transaction...');

                // Sign the transaction
                // Patch keyPair to ensure publicKey is a Buffer and sign/signSchnorr return Buffer for bitcoinjs-lib compatibility
                const patchedKeyPair = {
                    ...keyPair,
                    publicKey: Buffer.from(keyPair.publicKey),
                    sign(hash: Buffer, lowR?: boolean) {
                        // @ts-ignore
                        const sig = keyPair.sign(hash, lowR);
                        // If sig is already a Buffer, return as is; otherwise, convert
                        return Buffer.isBuffer(sig) ? sig : Buffer.from(sig);
                    },
                    signSchnorr(hash: Uint8Array) {
                        // @ts-ignore
                        const sig = keyPair.signSchnorr(hash);
                        // Always return Buffer for compatibility
                        return Buffer.isBuffer(sig) ? sig : Buffer.from(sig);
                    },
                };
                psbt.signAllInputs(patchedKeyPair);
                psbt.finalizeAllInputs();

                const rawTx = psbt.extractTransaction().toHex();
                console.log(
                    '[DEBUG] Transaction signed, raw tx length:',
                    rawTx.length
                );
                console.log('[DEBUG] Broadcasting transaction...');

                const broadcastUrl =
                    network === 'testnet'
                        ? 'https://blockstream.info/testnet/api/tx'
                        : 'https://blockstream.info/api/tx';

                const resp = await axios.post(broadcastUrl, rawTx, {
                    headers: { 'Content-Type': 'text/plain' },
                });
                txHash = resp.data as string;
                console.log(
                    '[DEBUG] Transaction broadcast successful:',
                    txHash
                );
            }
            // USDT TRC20 (Tron) - NOT IMPLEMENTED
            else if (chain === 'usdt_trc20') {
                throw new Error(
                    'USDT TRC20 transfers not implemented. Use TronWeb.'
                );
            } else {
                throw new Error('Unsupported chain');
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

// Add this helper at the top or inside the WalletController class
function sortAddressesByChainOrder(addresses: any[]): any[] {
    const order = ['eth', 'btc', 'sol', 'strk', 'usdterc20', 'usdttrc20'];
    // Normalize chain names for sorting
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
