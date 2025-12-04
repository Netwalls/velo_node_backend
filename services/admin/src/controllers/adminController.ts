import { Request, Response } from 'express';
import pool from '../config/db';
import PriceFeedService from '../services/priceFeedService';
import { NotificationType } from '../types';

export default class AdminController {
  /**
   * GET /admin/stats
   * Returns dashboard statistics adapted to the admin microservice DB schema.
   */
  static async getStats(req: Request, res: Response) {
    try {
      // Basic helpers that tolerate missing tables/columns
      const querySingle = async (sql: string, params: any[] = []) => {
        try {
          const r = await pool.query(sql, params);
          return r.rows[0];
        } catch (e) {
          console.warn('[Admin] query failed:', sql, e && (e.message || String(e)));
          return null;
        }
      };

      const queryMany = async (sql: string, params: any[] = []) => {
        try {
          const r = await pool.query(sql, params);
          return r.rows;
        } catch (e) {
          console.warn('[Admin] query failed:', sql, e && (e.message || String(e)));
          return [];
        }
      };

      const totalUsersRow = await querySingle('SELECT COUNT(*)::int AS count FROM users');
      const totalUsers = Number(totalUsersRow?.count || 0);

      const txSumRow = await querySingle("SELECT COALESCE(SUM(amount),0) AS sum FROM transactions WHERE status = 'confirmed'");
      const merchantSumRow = await querySingle("SELECT COALESCE(SUM(amount),0) AS sum FROM merchant_payments WHERE status = 'completed'");
      const splitExecSumRow = await querySingle("SELECT COALESCE(SUM(total_amount),0) AS sum FROM split_payment_executions WHERE status IN ('completed','partially_failed')");

      const txSum = Number(txSumRow?.sum || 0);
      const merchantSum = Number(merchantSumRow?.sum || 0);
      const splitExecSum = Number(splitExecSumRow?.sum || 0);
      const totalConfirmedAmount = txSum + merchantSum + splitExecSum;

      const chainRaw = await querySingle('SELECT chain, COUNT(*)::int AS count FROM transactions GROUP BY chain ORDER BY count DESC LIMIT 1');
      const mostUsedChain = chainRaw?.chain || null;

      const perChainRows = await queryMany("SELECT chain, COUNT(*)::int AS count, COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END),0) AS confirmed_sum FROM transactions GROUP BY chain ORDER BY count DESC");
      const perChain = perChainRows.map((r: any) => ({ chain: r.chain, count: Number(r.count || 0), confirmedAmount: Number(r.confirmed_sum || 0) }));

      // Addresses and holdings
      const addrRows = await queryMany('SELECT * FROM user_addresses');
      const holdingsByChain: Record<string, number> = {};
      for (const a of addrRows) {
        const chainKey = (a.chain || 'unknown').toLowerCase();
        const bal = Number(a.last_known_balance ?? a.lastKnownBalance ?? 0) || 0;
        holdingsByChain[chainKey] = (holdingsByChain[chainKey] || 0) + bal;
      }

      // Convert holdings to USD
      let totalUSD = 0;
      const holdingsDetailed: Array<{ chain: string; balance: number; usd?: number }> = [];
      const priceMap = await PriceFeedService.getAllPrices();

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

      for (const [chainKey, balance] of Object.entries(holdingsByChain)) {
        let usd = 0;
        const cur = currencyMap[chainKey];
        if (cur) {
          let price = priceMap[cur] ?? 0;
          if (!price) {
            try {
              price = await PriceFeedService.getPrice(cur);
              priceMap[cur] = price;
            } catch (e) {
              price = 0;
            }
          }

          if (price && price > 0) {
            usd = balance * price;
            totalUSD += usd;
          }
        }
        holdingsDetailed.push({ chain: chainKey, balance, usd });
      }

      // Transaction activity
      const txTypeRows = await queryMany('SELECT chain, type, COUNT(*)::int AS count FROM transactions GROUP BY chain, type');
      const merchantRows = await queryMany('SELECT chain, COUNT(*)::int AS count FROM merchant_payments GROUP BY chain');

      // Split executions per chain - attempt two common join variants
      let splitRows: any[] = [];
      try {
        splitRows = await queryMany('SELECT sp.chain AS chain, COUNT(*)::int AS count FROM split_payment_executions s LEFT JOIN split_payments sp ON s."splitPaymentId" = sp.id GROUP BY sp.chain');
      } catch (e) {
        try {
          splitRows = await queryMany('SELECT sp.chain AS chain, COUNT(*)::int AS count FROM split_payment_executions s LEFT JOIN split_payments sp ON s.split_payment_id = sp.id GROUP BY sp.chain');
        } catch (e2) {
          console.warn('[Admin] split execution per-chain query failed, continuing with empty results');
          splitRows = [];
        }
      }

      const activityMap: Record<string, { send: number; receive: number; qr: number; splitting: number; total: number }> = {};
      const ensureChain = (k: string) => {
        const kk = (k || 'unknown').toLowerCase();
        if (!activityMap[kk]) activityMap[kk] = { send: 0, receive: 0, qr: 0, splitting: 0, total: 0 };
        return kk;
      };

      for (const r of txTypeRows) {
        const chain = ensureChain(r.chain);
        const cnt = Number(r.count || 0);
        const type = (r.type || '').toLowerCase();
        if (type === 'send') activityMap[chain].send += cnt;
        else if (type === 'receive') activityMap[chain].receive += cnt;
        activityMap[chain].total += cnt;
      }

      for (const r of merchantRows) {
        const chain = ensureChain(r.chain);
        const cnt = Number(r.count || 0);
        activityMap[chain].qr += cnt;
        activityMap[chain].total += cnt;
      }

      for (const r of splitRows) {
        const chain = ensureChain(r.chain);
        const cnt = Number(r.count || 0);
        activityMap[chain].splitting += cnt;
        activityMap[chain].total += cnt;
      }

      let sendCount = 0, receiveCount = 0, qrCount = 0, splitCount = 0;
      for (const v of Object.values(activityMap)) {
        sendCount += v.send; receiveCount += v.receive; qrCount += v.qr; splitCount += v.splitting;
      }

      const depositNotifRow = await querySingle('SELECT COUNT(*)::int AS count FROM notifications WHERE type = $1', [NotificationType.DEPOSIT]);
      const depositNotifCount = Number(depositNotifRow?.count || 0);
      receiveCount += depositNotifCount;

      // Determine most used by activity, tie-break by holdings USD
      let computedMostUsed: string | null = null; let maxActivity = -1;
      for (const [chain, vals] of Object.entries(activityMap)) {
        if (vals.total > maxActivity) { maxActivity = vals.total; computedMostUsed = chain; }
        else if (vals.total === maxActivity && vals.total > 0) {
          const currentHold = holdingsDetailed.find(h => h.chain === computedMostUsed)?.usd || 0;
          const challengerHold = holdingsDetailed.find(h => h.chain === chain)?.usd || 0;
          if ((challengerHold || 0) > (currentHold || 0)) computedMostUsed = chain;
        }
      }

      let mostHeldChain: string | null = null; let maxUsd = -1;
      for (const h of holdingsDetailed) {
        const usdVal = Number(h.usd || 0);
        if (usdVal > maxUsd) { maxUsd = usdVal; mostHeldChain = h.chain; }
      }

      const finalMostUsed = computedMostUsed || mostUsedChain;

      return res.json({ stats: {
        totalUsers,
        totalConfirmedAmount,
        totalAmount: totalUSD,
        mostUsedChain: finalMostUsed,
        mostHeldChain,
        perChain,
        holdings: holdingsDetailed,
        usage: { send: sendCount, receive: receiveCount, qrPayment: qrCount, splitting: splitCount },
      }});
    } catch (error) {
      console.error('Admin stats error:', error);
      return res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'User id required' });

      // Run delete in a transaction so we can report errors cleanly
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Some DB schemas don't configure ON DELETE CASCADE for related tables.
        // Delete dependent rows explicitly first to avoid FK constraint failures.
        await client.query('DELETE FROM user_addresses WHERE "userId" = $1', [id]);
        await client.query('DELETE FROM refresh_tokens WHERE "userId" = $1', [id]);

        // Now delete the user
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found' });
        }

        await client.query('COMMIT');
        return res.json({ message: 'User deleted successfully', userId: id });
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Failed to delete user:', err);
        // In development expose error message to help debugging; otherwise return generic error
        if (process.env.NODE_ENV === 'development') {
          return res.status(500).json({ error: 'Failed to delete user', details: err && (err.message || String(err)) });
        }
        return res.status(500).json({ error: 'Failed to delete user' });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Delete user error:', err);
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ error: 'Server error', details: err && (err.message || String(err)) });
      }
      return res.status(500).json({ error: 'Server error' });
    }
  }
}
