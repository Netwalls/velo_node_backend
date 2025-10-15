import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { UserAddress } from '../src/entities/UserAddress';
import axios from 'axios';

// Simple concurrency pool
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>) {
    const results: R[] = [];
    const executing: Promise<void>[] = [];
    for (const item of items) {
        const p = (async () => {
            const r = await fn(item);
            results.push(r);
        })();
        executing.push(p.then(() => {}));
        if (executing.length >= concurrency) {
            await Promise.race(executing);
            // remove resolved
            for (let i = executing.length - 1; i >= 0; i--) {
                if ((executing[i] as any).isFulfilled) executing.splice(i, 1);
            }
        }
    }
    await Promise.all(executing);
    return results;
}

async function fetchBalanceForAddress(addr: UserAddress): Promise<{ chain: string; address: string; balance: number } | null> {
    try {
        if (addr.chain === 'ethereum' || addr.chain === 'usdt_erc20') {
            const ethers = await import('ethers');
            const provider = new ethers.JsonRpcProvider(
                addr.network === 'testnet'
                    ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                    : `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
            );
            const b = await provider.getBalance(addr.address);
            return { chain: addr.chain, address: addr.address, balance: Number(ethers.formatEther(b)) };
        }

        if (addr.chain === 'bitcoin') {
            const url = (addr.network === 'testnet' ? 'https://blockstream.info/testnet/api/address/' : 'https://blockstream.info/api/address/') + addr.address;
            const resp = await axios.get(url, { timeout: 10000 });
            const data = resp.data as any;
            const balanceInSatoshis = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
            return { chain: addr.chain, address: addr.address, balance: balanceInSatoshis / 1e8 };
        }

        if (addr.chain === 'solana') {
            const solWeb = await import('@solana/web3.js');
            const conn = new solWeb.Connection(
                addr.network === 'testnet'
                    ? `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
                    : `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
            );
            const pk = new solWeb.PublicKey(addr.address);
            const b = await conn.getBalance(pk);
            return { chain: addr.chain, address: addr.address, balance: b / 1e9 };
        }

        if (addr.chain === 'stellar') {
            const horizon = addr.network === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
            const resp = await axios.get(`${horizon}/accounts/${addr.address}`, { timeout: 10000 });
            const data = resp.data as any;
            const native = (data.balances || []).find((b: any) => b.asset_type === 'native');
            return { chain: addr.chain, address: addr.address, balance: native ? Number(native.balance) : 0 };
        }

        if (addr.chain === 'polkadot') {
            const { ApiPromise, WsProvider } = await import('@polkadot/api');
            const wsUrl = addr.network === 'testnet' ? (process.env.POLKADOT_WS_TESTNET || 'wss://pas-rpc.stakeworld.io') : (process.env.POLKADOT_WS_MAINNET || 'wss://rpc.polkadot.io');
            const provider = new WsProvider(wsUrl);
            const api = await ApiPromise.create({ provider });
            const derived = await api.derive.balances.account(addr.address) as any;
            const available = (derived && (derived.availableBalance ?? derived.freeBalance ?? derived.free)) || 0;
            const PLANCK = BigInt(10 ** 10);
            const availableBig = BigInt(String(available));
            const dot = Number(availableBig / PLANCK);
            try { await api.disconnect(); } catch {}
            return { chain: addr.chain, address: addr.address, balance: dot };
        }

        if (addr.chain === 'starknet') {
            try {
                // dynamic import of starknet RpcProvider
                // @ts-ignore
                const { RpcProvider } = await import('starknet');
                const nodeUrl = addr.network === 'testnet'
                    ? `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`
                    : `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`;
                const provider = new RpcProvider({ nodeUrl });
                const tokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
                // callContract returns an array-like response; match controller logic
                const result: any = await provider.callContract({ contractAddress: tokenAddress, entrypoint: 'balanceOf', calldata: [addr.address] });
                const balanceHex = result && result[0] ? result[0] : '0x0';
                const balanceDecimal = parseInt(balanceHex.toString(), 16);
                const balanceInSTRK = Number(balanceDecimal) / 1e18;
                return { chain: addr.chain, address: addr.address, balance: balanceInSTRK };
            } catch (err) {
                console.warn('Failed to fetch balance for starknet', addr.address, (err as any)?.message || String(err));
                return null;
            }
        }

        // fallback: return null when unsupported
        return null;
    } catch (err) {
        console.warn('Failed to fetch balance for', addr.chain, addr.address, (err as any)?.message || String(err));
        return null;
    }
}

async function main() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(UserAddress);
    const addrs = await repo.find();
    console.log(`Found ${addrs.length} addresses, fetching balances...`);

    const concurrency = Number(process.env.BALANCE_FETCH_CONCURRENCY || 8);

    const results: Array<{ chain: string; address: string; balance: number } | null> = [];

    // process with concurrency
    const batchSize = concurrency;
    for (let i = 0; i < addrs.length; i += batchSize) {
        const batch = addrs.slice(i, i + batchSize);
        const fetched = await Promise.all(batch.map((a) => fetchBalanceForAddress(a)));
        for (let j = 0; j < batch.length; j++) {
            const res = fetched[j];
            if (res && typeof res.balance === 'number') {
                try {
                    const addr = batch[j];
                    addr.lastKnownBalance = res.balance;
                    await repo.save(addr);
                } catch (e) {
                    console.warn('Failed to persist', batch[j].address, (e as any)?.message || String(e));
                }
            }
            results.push(res);
        }
    }

    // summarise per-chain
    const summary: Record<string, number> = {};
    for (const r of results) {
        if (!r) continue;
        summary[r.chain] = (summary[r.chain] || 0) + (r.balance || 0);
    }

    console.log('Holdings summary by chain:');
    for (const [chain, bal] of Object.entries(summary)) {
        console.log(` - ${chain}: ${bal}`);
    }

    await AppDataSource.destroy();
    process.exit(0);
}

main().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
