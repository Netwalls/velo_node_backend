import axios from 'axios';

export class PriceFeedService {
  private static readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private static readonly CACHE_DURATION = 30000; // 30s
  private static priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private static inflight: Map<string, Promise<number>> = new Map();

  private static readonly CURRENCY_IDS: Record<string, string> = {
    ETH: 'ethereum',
    BTC: 'bitcoin',
    SOL: 'solana',
    STRK: 'starknet',
    XLM: 'stellar',
    DOT: 'polkadot',
    USDT: 'tether',
  };

  static async getPrice(currency: string): Promise<number> {
    const key = currency.toUpperCase();
    const now = Date.now();
    const cached = this.priceCache.get(key);
    if (cached && now - cached.timestamp < this.CACHE_DURATION) return cached.price;

    if (this.inflight.has(key)) return this.inflight.get(key)!;

    const p = (async () => {
      if (key === 'USD') {
        this.priceCache.set(key, { price: 1, timestamp: Date.now() });
        return 1;
      }

      if (key === 'NGN') {
        return await this.getNGNPrice();
      }

      const coinId = this.CURRENCY_IDS[key];
      if (!coinId) throw new Error(`Unsupported currency ${currency}`);

      const resp = await axios.get(`${this.COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`, { timeout: 10000 });
      const data = resp.data as Record<string, { usd?: number }>;
      const price = data[coinId]?.usd;
      if (!price) throw new Error('Price not found');

      this.priceCache.set(key, { price, timestamp: Date.now() });
      return price;
    })();

    this.inflight.set(key, p);
    try {
      return await p;
    } finally {
      this.inflight.delete(key);
    }
  }

  private static async getNGNPrice(): Promise<number> {
    const cacheKey = 'NGN';
    try {
      const r = await axios.get('https://open.er-api.com/v6/latest/NGN', { timeout: 5000 });
      const usd = r.data?.rates?.USD;
      if (usd) {
        this.priceCache.set(cacheKey, { price: usd, timestamp: Date.now() });
        return usd;
      }
    } catch (e) {
      // continue
    }

    try {
      const r = await axios.get('https://api.exchangerate.host/convert?from=NGN&to=USD&amount=1', { timeout: 5000 });
      if (r.data?.result) {
        const usd = Number(r.data.result);
        this.priceCache.set(cacheKey, { price: usd, timestamp: Date.now() });
        return usd;
      }
    } catch (e) {}

    const cached = this.priceCache.get(cacheKey);
    if (cached) return cached.price;

    const FALLBACK_RATE = 1 / 1600;
    this.priceCache.set(cacheKey, { price: FALLBACK_RATE, timestamp: Date.now() });
    return FALLBACK_RATE;
  }

  static async getAllPrices(): Promise<Record<string, number>> {
    const entries = Object.entries(this.CURRENCY_IDS);
    const uniqueIds = Array.from(new Set(entries.map(([, id]) => id))).join(',');
    try {
      const resp = await axios.get(`${this.COINGECKO_API}/simple/price?ids=${uniqueIds}&vs_currencies=usd`, { timeout: 15000 });
      const data = resp.data as Record<string, { usd?: number }>;
      const prices: Record<string, number> = {};
      for (const [cur, id] of entries) {
        prices[cur] = (data[id] && Number(data[id].usd)) || 0;
        if (prices[cur]) this.priceCache.set(cur, { price: prices[cur], timestamp: Date.now() });
      }
      return prices;
    } catch (e) {
      const prices: Record<string, number> = {};
      await Promise.allSettled(Object.keys(this.CURRENCY_IDS).map(async (c) => {
        try { prices[c] = await this.getPrice(c); } catch { prices[c] = 0; }
      }));
      return prices;
    }
  }

  static clearCache(): void { this.priceCache.clear(); }
}

export default PriceFeedService;
