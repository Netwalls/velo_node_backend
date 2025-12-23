// Copied from src/services/exchangeRateService.ts
import axios from 'axios';

export interface ExchangeRates {
    tether: { ngn: number };
    'usd-coin': { ngn: number };
    starknet: { ngn: number };
    ethereum: { ngn: number };
    bitcoin: { ngn: number };
    solana: { ngn: number };
    polkadot: { ngn: number };
    stellar: { ngn: number };
}

export class ExchangeRateService {
    private readonly COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
    private cache: { rates: ExchangeRates | null; timestamp: number } = {
        rates: null,
        timestamp: 0
    };
    private readonly CACHE_DURATION = 60 * 1000; // 1 minute cache

    async getExchangeRates(): Promise<ExchangeRates> {
        if (this.cache.rates && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
            console.log('📊 Using cached exchange rates');
            return this.cache.rates;
        }

        try {
            console.log('📊 Fetching fresh exchange rates from CoinGecko...');

            const response = await axios.get<ExchangeRates>(this.COINGECKO_API_URL, {
                params: {
                    ids: 'tether,usd-coin,starknet,ethereum,bitcoin,solana,polkadot,stellar',
                    vs_currencies: 'ngn'
                },
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000
            });

            this.cache = {
                rates: response.data,
                timestamp: Date.now()
            };

            console.log('✅ Exchange rates updated successfully');
            return response.data;

        } catch (error: any) {
            console.error('❌ CoinGecko API error:', error.message);

            if (this.cache.rates) {
                console.log('⚠️ Using cached rates as fallback due to API error');
                return this.cache.rates;
            }

            throw new Error(`Failed to fetch exchange rates: ${error.message}`);
        }
    }

    async getCryptoRate(cryptoId: string): Promise<number> {
        const rates = await this.getExchangeRates();

        const rateMap: { [key: string]: keyof ExchangeRates } = {
            'usdt': 'tether',
            'usdc': 'usd-coin',
            'strk': 'starknet',
            'eth': 'ethereum',
            'btc': 'bitcoin',
            'sol': 'solana',
            'dot': 'polkadot',
            'xlm': 'stellar'
        };

        const coingeckoId = rateMap[cryptoId.toLowerCase()];
        if (!coingeckoId || !rates[coingeckoId]) {
            throw new Error(`Exchange rate not available for: ${cryptoId}`);
        }

        return rates[coingeckoId].ngn;
    }

    async convertFiatToCrypto(fiatAmount: number, cryptoId: string): Promise<number> {
        const rate = await this.getCryptoRate(cryptoId);
        const cryptoAmount = fiatAmount / rate;

        return Math.round(cryptoAmount * 100000000) / 100000000;
    }

    async convertCryptoToFiat(cryptoAmount: number, cryptoId: string): Promise<number> {
        const rate = await this.getCryptoRate(cryptoId);
        return cryptoAmount * rate;
    }

    async getAllRates() {
        const rates = await this.getExchangeRates();
        return {
            USDT: rates.tether.ngn,
            USDC: rates['usd-coin'].ngn,
            STRK: rates.starknet.ngn,
            ETH: rates.ethereum.ngn,
            BTC: rates.bitcoin.ngn,
            SOL: rates.solana.ngn,
            DOT: rates.polkadot.ngn,
            XLM: rates.stellar.ngn,
            lastUpdated: new Date(this.cache.timestamp).toISOString()
        };
    }
}

export const exchangeRateService = new ExchangeRateService();
