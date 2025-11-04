import 'dotenv/config';
import { AppDataSource } from '../config/database_migration';
import { UserAddress } from '../entities/UserAddress';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types';
import { RpcProvider } from 'starknet';
import { ethers } from 'ethers';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * One-off backfill script.
 * Scans all user addresses and, when an address has a positive on-chain balance
 * and there are no existing deposit notifications for that address, creates a
 * Deposit notification and updates lastKnownBalance.
 *
 * WARNING: This will create notifications for existing balances. Run only when
 * you want historic notifications.
 */
async function run() {
    await AppDataSource.initialize();
    console.log('DB connected');

    const addressRepo = AppDataSource.getRepository(UserAddress);
    const notifRepo = AppDataSource.getRepository(Notification);

    // Only target mainnet addresses for backfill to avoid creating testnet notifications
    const addresses = await addressRepo.find({ where: { network: 'mainnet' } as any });
    console.log(`Found ${addresses.length} mainnet addresses`);

    for (const addr of addresses) {
        try {
            let currentBalance = 0;
            switch ((addr.chain || '').toLowerCase()) {
                case 'ethereum': {
                    const url = addr.network === 'testnet'
                        ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                        : `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                    const provider = new ethers.JsonRpcProvider(url);
                    const bal = await provider.getBalance(addr.address as string);
                    currentBalance = Number(ethers.formatEther(bal));
                    break;
                }
                case 'bitcoin': {
                    const base = addr.network === 'testnet' ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api';
                    const resp = await axios.get<any>(`${base}/address/${addr.address}`);
                    const data = resp.data as any;
                    const funded = Number(data?.chain_stats?.funded_txo_sum ?? 0);
                    const spent = Number(data?.chain_stats?.spent_txo_sum ?? 0);
                    const sats = funded - spent;
                    currentBalance = sats / 1e8;
                    break;
                }
                case 'solana': {
                    const url = addr.network === 'testnet'
                        ? `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                        : `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                    const conn = new Connection(url);
                    const bal = await conn.getBalance(new PublicKey(addr.address as string));
                    currentBalance = bal / 1e9;
                    break;
                }
                case 'starknet': {
                    const url = addr.network === 'testnet'
                        ? `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`
                        : `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`;
                    const provider = new RpcProvider({ nodeUrl: url });
                    const token = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                    const res = await provider.callContract({ contractAddress: token, entrypoint: 'balanceOf', calldata: [addr.address as string] }, 'latest');
                    const hex = res && res[0] ? res[0] : '0x0';
                    currentBalance = Number(BigInt(hex)) / 1e18;
                    break;
                }
                case 'stellar': {
                    const horizon = addr.network === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
                    const resp = await axios.get<any>(`${horizon}/accounts/${addr.address}`);
                    const data = resp.data as any;
                    const native = (data.balances || []).find((b: any) => b.asset_type === 'native');
                    currentBalance = native ? Number(native.balance) : 0;
                    break;
                }
                case 'usdt_erc20':
                case 'usdt_trc20':
                case 'usdt': {
                    // Try ETH USDT on-chain balance via Etherscan/Alchemy provider
                    const url = addr.network === 'testnet'
                        ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                        : `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
                    const provider = new ethers.JsonRpcProvider(url);
                    // USDT mainnet contract
                    const usdtAddr = addr.network === 'testnet' ? '0x516de3a7a567d81737e3a46ec4ff9cfd1fcb0136' : '0xdAC17F958D2ee523a2206206994597C13D831ec7';
                    const abi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
                    const c = new ethers.Contract(usdtAddr, abi, provider);
                    try {
                        const bal = await c.balanceOf(addr.address);
                        const decimals = await c.decimals();
                        currentBalance = Number(ethers.formatUnits(bal, decimals));
                    } catch (e) {
                        currentBalance = 0;
                    }
                    break;
                }
                default:
                    console.log('Skipping unsupported chain:', addr.chain);
            }

            if (!currentBalance || currentBalance <= 0) {
                // update lastKnownBalance to 0 if missing
                if (addr.lastKnownBalance === null || addr.lastKnownBalance === undefined) {
                    addr.lastKnownBalance = 0;
                    await addressRepo.save(addr);
                }
                continue;
            }

            // Check if there is already a deposit notification for this address
            const existing = await notifRepo.findOne({ where: { 'details': { address: addr.address }, type: NotificationType.DEPOSIT } as any });
            if (existing) {
                // update lastKnownBalance if needed
                if (Number(addr.lastKnownBalance ?? 0) < currentBalance) {
                    addr.lastKnownBalance = currentBalance;
                    await addressRepo.save(addr);
                }
                continue;
            }

            // Create deposit notification
            const chainLabel = String(addr.chain ?? 'unknown').toUpperCase();
            await notifRepo.save(
                notifRepo.create({
                    userId: addr.userId,
                    type: NotificationType.DEPOSIT,
                    title: 'Deposit (backfill)',
                    message: `Your deposit of ${currentBalance} ${chainLabel} was recorded (backfill).`,
                    details: { address: addr.address, amount: currentBalance, chain: addr.chain, network: addr.network },
                    isRead: false,
                    createdAt: new Date(),
                })
            );

            // Update lastKnownBalance
            addr.lastKnownBalance = currentBalance;
            await addressRepo.save(addr);

            console.log(`Created backfill notification for ${addr.address} (${addr.chain}) amount=${currentBalance}`);
        } catch (err) {
            console.error('Backfill error for', addr.address, (err as any)?.message || err);
            continue;
        }
    }

    console.log('Backfill finished');
    process.exit(0);
}

run().catch((e) => {
    console.error('Backfill failed', (e as any)?.message || e);
    process.exit(1);
});
