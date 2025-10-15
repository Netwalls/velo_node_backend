import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Transaction } from '../entities/Transaction';
import { MerchantPayment } from '../entities/MerchantPayment';
import { SplitPaymentExecution } from '../entities/SplitPaymentExecution';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import axios from 'axios';
import { UserAddress } from '../entities/UserAddress';
import { PriceFeedService } from '../services/priceFeedService';

export class AdminController {
    /**
     * GET /admin/stats
     * Returns dashboard statistics: total users, total amount (confirmed transactions),
     * most used chain, and most used functionality counts (send, receive, qrpayment, splitting)
     */
    static async getStats(req: Request, res: Response) {
        try {
            const userRepo = AppDataSource.getRepository(User);
            const txRepo = AppDataSource.getRepository(Transaction);
            const notificationRepo = AppDataSource.getRepository(Notification);
            const merchantRepo = AppDataSource.getRepository(MerchantPayment);
            const splitExecRepo = AppDataSource.getRepository(SplitPaymentExecution);

            // Total users
            const totalUsers = await userRepo.count();

            // Total amount that passed through Velo
            // Include: confirmed transactions, completed merchant payments, and completed/partially failed split executions
            const txSumRaw: any = await txRepo
                .createQueryBuilder('t')
                .select('COALESCE(SUM(t.amount), 0)', 'sum')
                .where('t.status = :status', { status: 'confirmed' })
                .getRawOne();

            const merchantSumRaw: any = await merchantRepo
                .createQueryBuilder('m')
                .select('COALESCE(SUM(m.amount), 0)', 'sum')
                .where('m.status = :status', { status: 'completed' })
                .getRawOne();

            // Sum split executions where some processing completed (completed or partially_failed)
            const splitExecSumRaw: any = await splitExecRepo
                .createQueryBuilder('s')
                .select("COALESCE(SUM(s.totalAmount), 0)", 'sum')
                .where("s.status IN (:...statuses)", { statuses: ['completed', 'partially_failed'] })
                .getRawOne();

            const txSum = txSumRaw && txSumRaw.sum ? Number(txSumRaw.sum) : 0;
            const merchantSum = merchantSumRaw && merchantSumRaw.sum ? Number(merchantSumRaw.sum) : 0;
            const splitExecSum = splitExecSumRaw && splitExecSumRaw.sum ? Number(splitExecSumRaw.sum) : 0;

            const totalAmount = txSum + merchantSum + splitExecSum;

            // Most used chain by transaction count
            const chainRaw: any = await txRepo
                .createQueryBuilder('t')
                .select('t.chain', 'chain')
                .addSelect('COUNT(*)', 'count')
                .groupBy('t.chain')
                .orderBy('count', 'DESC')
                .limit(1)
                .getRawOne();

            const mostUsedChain = chainRaw && chainRaw.chain ? chainRaw.chain : null;

            // Per-chain breakdown: count and total confirmed amount per chain
            const perChainRows: any[] = await txRepo
                .createQueryBuilder('t')
                .select('t.chain', 'chain')
                .addSelect('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(CASE WHEN t.status = :status THEN t.amount ELSE 0 END), 0)', 'confirmed_sum')
                .setParameter('status', 'confirmed')
                .groupBy('t.chain')
                .orderBy('count', 'DESC')
                .getRawMany();

            const perChain = perChainRows.map((r) => ({
                chain: r.chain,
                count: Number(r.count || 0),
                confirmedAmount: Number(r.confirmed_sum || 0),
            }));

            // Optionally force a live refresh of balances from the chain for all addresses
            // If refresh=true and wait=true, we will perform the refresh synchronously (slow).
            // If refresh=true and wait is not set, we start a background refresh and return cached stats immediately.
            const forceRefresh = req.query && String(req.query.refresh) === 'true';
            const waitForRefresh = req.query && String(req.query.wait) === 'true';

            // Compute total holdings across all users by summing lastKnownBalance per chain.
            // If forceRefresh is true or lastKnownBalance is zero/missing, fall back to an on-chain/lightweight query for that address.
            const addrRepo = AppDataSource.getRepository(UserAddress);
            const allAddrs = await addrRepo.find();
            const holdingsByChain: Record<string, number> = {};

            // Refresh balances: if forceRefresh && !waitForRefresh, run in background and return cached results immediately.
            if (forceRefresh && !waitForRefresh) {
                // start a background refresh (do not await)
                (async () => {
                    console.log('[Admin] Starting background balance refresh');
                    for (const a of allAddrs) {
                        const chainKey = (a.chain || 'unknown').toLowerCase();
                        let bal = Number(a.lastKnownBalance || 0);
                        if (!bal || bal === 0) {
                            try {
                                // Lightweight on-chain fetch (same logic as synchronous path)
                                if (a.chain === 'ethereum' || a.chain === 'usdt_erc20') {
                                    // dynamic import ethers to avoid breaking when not installed
                                    // @ts-ignore
                                    const ethers = (await import('ethers')) as any;
                                    const provider = new ethers.JsonRpcProvider(
                                        a.network === 'testnet'
                                            ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                                            : `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                                    );
                                    const b = await provider.getBalance(a.address);
                                    bal = Number(ethers.formatEther(b));
                                } else if (a.chain === 'bitcoin') {
                                    const url =
                                        (a.network === 'testnet'
                                            ? 'https://blockstream.info/testnet/api/address/'
                                            : 'https://blockstream.info/api/address/') +
                                        a.address;
                                    const resp = await axios.get(url, { timeout: 10000 });
                                    const data = resp.data as any;
                                    const balanceInSatoshis = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
                                    bal = balanceInSatoshis / 1e8;
                                } else if (a.chain === 'solana') {
                                    // @ts-ignore
                                    const solWeb = await import('@solana/web3.js');
                                    const conn = new solWeb.Connection(
                                        a.network === 'testnet'
                                            ? `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                                            : `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                                    );
                                    const pk = new solWeb.PublicKey(a.address);
                                    const b = await conn.getBalance(pk);
                                    bal = b / 1e9;
                                } else if (a.chain === 'stellar') {
                                    const horizon = a.network === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
                                    const resp = await axios.get(`${horizon}/accounts/${a.address}`, { timeout: 10000 });
                                    const data = resp.data as any;
                                    const native = (data.balances || []).find((b: any) => b.asset_type === 'native');
                                    bal = native ? Number(native.balance) : 0;
                                } else if (a.chain === 'polkadot') {
                                    // @ts-ignore
                                    const { ApiPromise, WsProvider } = await import('@polkadot/api');
                                    const wsUrl = a.network === 'testnet' ? (process.env.POLKADOT_WS_TESTNET || 'wss://pas-rpc.stakeworld.io') : (process.env.POLKADOT_WS_MAINNET || 'wss://rpc.polkadot.io');
                                    const provider = new WsProvider(wsUrl);
                                    const api = await ApiPromise.create({ provider });
                                    const derived = await api.derive.balances.account(a.address);
                                    const derivedAny = derived as any;
                                    const available = (derivedAny && (derivedAny.availableBalance ?? derivedAny.freeBalance ?? derivedAny.free)) || 0;
                                    const PLANCK = BigInt(10 ** 10);
                                    const availableBig = BigInt(String(available));
                                    bal = Number(availableBig / PLANCK);
                                    try { await api.disconnect(); } catch {}
                                }
                            } catch (err: any) {
                                console.warn(`Background: Failed to fetch balance for ${a.chain} ${a.address}:`, err && (err.message || String(err)));
                            }
                        }

                        try {
                            const prev = Number(a.lastKnownBalance || 0);
                            // Persist when fetched balance differs from stored balance (covers initial 0 and updates)
                            if (!Number.isNaN(bal) && bal !== prev) {
                                a.lastKnownBalance = bal;
                                await addrRepo.save(a);
                            }
                        } catch (saveErr: any) {
                            console.warn('Background: Failed to persist lastKnownBalance for address', a.address, (saveErr as any) && ((saveErr as any).message || String(saveErr)));
                        }
                    }
                    console.log('[Admin] Background balance refresh completed');
                })().catch((e) => console.error('[Admin] Background refresh error:', e));
            }

            // Build holdingsByChain from cached lastKnownBalance (fast)
            for (const a of allAddrs) {
                const chainKey = (a.chain || 'unknown').toLowerCase();
                const bal = Number(a.lastKnownBalance || 0);
                holdingsByChain[chainKey] = (holdingsByChain[chainKey] || 0) + bal;
            }

            // Convert holdings to USD where possible and compute totalAmount
            let totalUSD = 0;
            const holdingsDetailed: Array<{ chain: string; balance: number; usd?: number }> = [];
            const priceMap = await PriceFeedService.getAllPrices();
            for (const [chainKey, balance] of Object.entries(holdingsByChain)) {
                let usd = 0;
                try {
                    // Map chain key to known currency codes
                    const currencyMap: Record<string, string> = {
                        ethereum: 'ETH',
                        usdt_erc20: 'USDT',
                        usdt_trc20: 'USDT',
                        bitcoin: 'BTC',
                        solana: 'SOL',
                        starknet: 'STRK',
                        stellar: 'XLM',
                        polkadot: 'DOT',
                    };
                    const cur = currencyMap[chainKey];
                    if (cur) {
                        // Use priceMap entry if greater than zero; otherwise attempt a live fetch for this currency
                        let price = priceMap[cur];
                        if (!price || price === 0) {
                            try {
                                price = await PriceFeedService.getPrice(cur);
                                // update priceMap so subsequent lookups benefit
                                priceMap[cur] = price;
                            } catch (err) {
                                // leave price as 0 if fetch fails
                                price = 0;
                            }
                        }

                        if (price && price > 0) {
                            usd = balance * price;
                            totalUSD += usd;
                        }
                    }
                } catch (e) {
                    // ignore conversion errors per-chain
                }
                holdingsDetailed.push({ chain: chainKey, balance, usd });
            }
            // Functionality counts (per-chain aggregation)
            // Get transaction counts grouped by chain and type
            const txTypeRows: any[] = await txRepo
                .createQueryBuilder('t')
                .select('t.chain', 'chain')
                .addSelect('t.type', 'type')
                .addSelect('COUNT(*)', 'count')
                .groupBy('t.chain')
                .addGroupBy('t.type')
                .getRawMany();

            // merchant (QR) counts per chain
            const merchantRows: any[] = await merchantRepo
                .createQueryBuilder('m')
                .select('m.chain', 'chain')
                .addSelect('COUNT(*)', 'count')
                .groupBy('m.chain')
                .getRawMany();

            // split execution counts per chain
            let splitRows: any[] = [];
            try {
                // split executions do not store chain directly; join to split_payments to get chain
                splitRows = await splitExecRepo
                    .createQueryBuilder('s')
                    // join against the split_payments table to access the chain column
                    .leftJoin('split_payments', 'sp', 's."splitPaymentId" = sp.id')
                    .select('sp.chain', 'chain')
                    .addSelect('COUNT(*)', 'count')
                    .groupBy('sp.chain')
                    .getRawMany();
            } catch (err) {
                // Defensive: if the join or column doesn't exist for some reason, log and continue with empty splitRows
                console.warn('query failed for split execution per-chain counts, continuing with empty results', (err as any) && ((err as any).message || String(err)));
                splitRows = [];
            }

            // Build activity map per chain
            const activityMap: Record<string, { send: number; receive: number; qr: number; splitting: number; total: number }> = {};

            function ensureChainEntry(k: string) {
                const kk = (k || 'unknown').toLowerCase();
                if (!activityMap[kk]) activityMap[kk] = { send: 0, receive: 0, qr: 0, splitting: 0, total: 0 };
                return kk;
            }

            for (const r of txTypeRows) {
                const chain = ensureChainEntry(r.chain);
                const cnt = Number(r.count || 0);
                const type = (r.type || '').toLowerCase();
                if (type === 'send') {
                    activityMap[chain].send += cnt;
                } else if (type === 'receive') {
                    activityMap[chain].receive += cnt;
                } else {
                    // treat other tx types as neutral for now
                }
                activityMap[chain].total += cnt;
            }

            for (const r of merchantRows) {
                const chain = ensureChainEntry(r.chain);
                const cnt = Number(r.count || 0);
                activityMap[chain].qr += cnt;
                activityMap[chain].total += cnt;
            }

            for (const r of splitRows) {
                const chain = ensureChainEntry(r.chain);
                const cnt = Number(r.count || 0);
                activityMap[chain].splitting += cnt;
                activityMap[chain].total += cnt;
            }

            // Deduce totals for usage summary (overall counts)
            let sendCount = 0;
            let receiveCount = 0;
            let qrCount = 0;
            let splitCount = 0;
            for (const [k, v] of Object.entries(activityMap)) {
                sendCount += v.send;
                receiveCount += v.receive;
                qrCount += v.qr;
                splitCount += v.splitting;
            }

            // Also include deposit notifications as receives (in case deposits were only logged as notifications)
            const depositNotifCount = await notificationRepo.count({ where: { type: NotificationType.DEPOSIT } });
            receiveCount += depositNotifCount;

            // Determine most used chain by activity total, use holdings USD as tie-breaker
            let computedMostUsed: string | null = null;
            let maxActivity = -1;
            for (const [chain, vals] of Object.entries(activityMap)) {
                if (vals.total > maxActivity) {
                    maxActivity = vals.total;
                    computedMostUsed = chain;
                } else if (vals.total === maxActivity && vals.total > 0) {
                    // tie-breaker: prefer chain with higher holdings USD
                    const currentHoldings = holdingsDetailed.find(h => h.chain === computedMostUsed)?.usd || 0;
                    const challengerHoldings = holdingsDetailed.find(h => h.chain === chain)?.usd || 0;
                    if ((challengerHoldings || 0) > (currentHoldings || 0)) {
                        computedMostUsed = chain;
                    }
                }
            }

            // Determine most held chain by USD
            let mostHeldChain: string | null = null;
            let maxUsd = -1;
            for (const h of holdingsDetailed) {
                const usdVal = Number(h.usd || 0);
                if (usdVal > maxUsd) {
                    maxUsd = usdVal;
                    mostHeldChain = h.chain;
                }
            }

            // If there was no activity rows at all, fall back to previous single-table mostUsedChain
            const finalMostUsed = computedMostUsed || mostUsedChain;

            res.json({
                stats: {
                    totalUsers,
                    totalConfirmedAmount: totalAmount,
                    // totalAmount is the USD value of all user-held balances
                    totalAmount: totalUSD,
                    mostUsedChain: finalMostUsed,
                    mostHeldChain,
                    perChain,
                    holdings: holdingsDetailed,
                    usage: {
                        send: sendCount,
                        receive: receiveCount,
                        qrPayment: qrCount,
                        splitting: splitCount,
                    },
                },
            });
        } catch (error) {
            console.error('Admin stats error:', error);
            res.status(500).json({ error: 'Failed to fetch admin statistics' });
        }
    }
}

export default AdminController;
