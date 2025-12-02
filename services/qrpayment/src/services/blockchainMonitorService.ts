/**
 * QR Payment Blockchain Monitor Service
 * Handles blockchain verification for QR payment requests
 */

import axios from 'axios';
import { MerchantPayment } from '../entities/MerchantPayment';

export interface BlockchainPaymentStatus {
  confirmed: boolean;
  transactionHash?: string;
  confirmations?: number;
  error?: string;
}

interface BlockchainConfig {
  apiUrl: string;
  apiKey?: string;
  explorerUrl?: string;
}

// Type definitions for API responses
interface EtherscanTransaction {
  hash: string;
  to: string;
  value: string;
  confirmations: string;
}

interface EtherscanResponse {
  status: string;
  result: EtherscanTransaction[];
}

interface BitcoinChainStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
}

interface BitcoinOutput {
  addr: string;
  value: number;
}

interface BitcoinTransaction {
  hash: string;
  confirmations: number;
  out: BitcoinOutput[];
}

interface BitcoinResponse {
  chain_stats?: BitcoinChainStats;
  txs?: BitcoinTransaction[];
}

interface SolanaSignature {
  signature: string;
}

interface SolanaRPCResponse {
  result: SolanaSignature[] | any;
}

interface StellarPaymentRecord {
  type: string;
  to: string;
  amount: string;
  transaction_hash: string;
}

interface StellarResponse {
  _embedded?: {
    records: StellarPaymentRecord[];
  };
}

const BLOCKCHAIN_APIS = {
  ethereum: {
    mainnet: {
      apiUrl: 'https://api.etherscan.io/api',
      apiKey: process.env.ETHERSCAN_API_KEY || '',
      explorerUrl: 'https://etherscan.io',
    },
    testnet: {
      apiUrl: 'https://api-sepolia.etherscan.io/api',
      apiKey: process.env.ETHERSCAN_API_KEY || '',
      explorerUrl: 'https://sepolia.etherscan.io',
    },
  },
  bitcoin: {
    mainnet: {
      apiUrl: 'https://blockchain.info/rawaddr',
      explorerUrl: 'https://blockchain.info',
    },
    testnet: {
      apiUrl: 'https://blockstream.info/testnet/api/address',
      explorerUrl: 'https://blockstream.info/testnet',
    },
  },
  solana: {
    mainnet: {
      apiUrl: 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://explorer.solana.com',
    },
    testnet: {
      apiUrl: 'https://api.testnet.solana.com',
      explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
    },
  },
  starknet: {
    mainnet: {
      apiUrl: process.env.STARKNET_MAINNET_RPC || 'https://alpha-mainnet.starknet.io',
      explorerUrl: 'https://starkscan.co',
    },
    testnet: {
      apiUrl: process.env.STARKNET_SEPOLIA_RPC || 'https://alpha4.starknet.io',
      explorerUrl: 'https://testnet.starkscan.co',
    },
  },
};

export class QRPaymentMonitorService {
  /**
   * Check blockchain for payment confirmation
   */
  static async checkPayment(payment: MerchantPayment): Promise<BlockchainPaymentStatus> {
    try {
      switch (payment.chain?.toLowerCase()) {
        case 'ethereum':
        case 'usdt-erc20':
          return await this.checkEthereumPayment(payment);
        case 'bitcoin':
          return await this.checkBitcoinPayment(payment);
        case 'solana':
          return await this.checkSolanaPayment(payment);
        case 'starknet':
          return await this.checkStarknetPayment(payment);
        case 'stellar':
          return await this.checkStellarPayment(payment);
        default:
          return { confirmed: false, error: `Unsupported chain: ${payment.chain}` };
      }
    } catch (error) {
      console.error('Blockchain check error:', error);
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get blockchain configuration
   */
  private static getBlockchainConfig(chain: string, network: string): BlockchainConfig {
    const normalizedNetwork = network?.toLowerCase() || 'mainnet';
    const normalizedChain = chain?.toLowerCase();
    
    const chainConfig = BLOCKCHAIN_APIS[normalizedChain as keyof typeof BLOCKCHAIN_APIS];

    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    if (normalizedChain === 'usdt-erc20') {
      return BLOCKCHAIN_APIS.ethereum[
        normalizedNetwork as keyof typeof BLOCKCHAIN_APIS.ethereum
      ];
    }

    const config = chainConfig[normalizedNetwork as keyof typeof chainConfig];

    if (!config) {
      throw new Error(`Unsupported network ${normalizedNetwork} for chain ${chain}`);
    }

    return config;
  }

  /**
   * Check Ethereum payment
   */
  private static async checkEthereumPayment(
    payment: MerchantPayment
  ): Promise<BlockchainPaymentStatus> {
    try {
      const config = this.getBlockchainConfig(payment.chain, payment.network);
      const response = await axios.get<EtherscanResponse>(config.apiUrl, {
        params: {
          module: 'account',
          action: 'txlist',
          address: payment.address,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: config.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.status === '1' && response.data.result) {
        const transactions = response.data.result;
        const expectedAmount = BigInt(Math.floor(Number(payment.amount) * 1e18));
        const tolerance = expectedAmount / BigInt(100);

        for (const tx of transactions) {
          if (tx.to?.toLowerCase() === payment.address.toLowerCase()) {
            const txAmount = BigInt(tx.value);
            if (txAmount >= expectedAmount - tolerance && txAmount <= expectedAmount + tolerance) {
              return {
                confirmed: true,
                transactionHash: tx.hash,
                confirmations: Number(tx.confirmations) || 1,
              };
            }
          }
        }
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Ethereum payment check error:', error);
      return { confirmed: false, error: 'Failed to check Ethereum payment' };
    }
  }

  /**
   * Check Bitcoin payment
   */
  private static async checkBitcoinPayment(
    payment: MerchantPayment
  ): Promise<BlockchainPaymentStatus> {
    try {
      const config = this.getBlockchainConfig(payment.chain, payment.network);
      const isTestnet = payment.network?.toLowerCase() === 'testnet';
      
      const url = `${config.apiUrl}/${payment.address}`;
      const response = await axios.get<BitcoinResponse>(url, { timeout: 10000 });
      
      const expectedSatoshis = Math.floor(Number(payment.amount) * 1e8);
      const tolerance = Math.floor(expectedSatoshis * 0.01);

      if (isTestnet && response.data.chain_stats) {
        const received = response.data.chain_stats.funded_txo_sum || 0;
        if (received >= expectedSatoshis - tolerance) {
          return {
            confirmed: true,
            transactionHash: 'bitcoin-testnet-confirmed',
            confirmations: 1,
          };
        }
      } else if (!isTestnet && response.data.txs) {
        for (const tx of response.data.txs) {
          for (const out of tx.out || []) {
            if (out.addr === payment.address && out.value >= expectedSatoshis - tolerance) {
              return {
                confirmed: true,
                transactionHash: tx.hash,
                confirmations: tx.confirmations || 1,
              };
            }
          }
        }
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Bitcoin payment check error:', error);
      return { confirmed: false, error: 'Failed to check Bitcoin payment' };
    }
  }

  /**
   * Check Solana payment
   */
  private static async checkSolanaPayment(
    payment: MerchantPayment
  ): Promise<BlockchainPaymentStatus> {
    try {
      const config = this.getBlockchainConfig(payment.chain, payment.network);
      const response = await axios.post<SolanaRPCResponse>(
        config.apiUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [payment.address, { limit: 10 }],
        },
        { timeout: 10000 }
      );

      if (response.data.result && response.data.result.length > 0) {
        const expectedLamports = Math.floor(Number(payment.amount) * 1e9);
        
        for (const sig of response.data.result) {
          const txResponse = await axios.post<SolanaRPCResponse>(
            config.apiUrl,
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [sig.signature, { encoding: 'jsonParsed' }],
            },
            { timeout: 10000 }
          );

          if (txResponse.data.result) {
            return {
              confirmed: true,
              transactionHash: sig.signature,
              confirmations: 1,
            };
          }
        }
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Solana payment check error:', error);
      return { confirmed: false, error: 'Failed to check Solana payment' };
    }
  }

  /**
   * Check Starknet payment
   */
  private static async checkStarknetPayment(
    payment: MerchantPayment
  ): Promise<BlockchainPaymentStatus> {
    try {
      return { confirmed: false, error: 'Starknet monitoring not yet implemented' };
    } catch (error) {
      console.error('Starknet payment check error:', error);
      return { confirmed: false, error: 'Failed to check Starknet payment' };
    }
  }

  /**
   * Check Stellar payment
   */
  private static async checkStellarPayment(
    payment: MerchantPayment
  ): Promise<BlockchainPaymentStatus> {
    try {
      const isTestnet = payment.network?.toLowerCase() === 'testnet';
      const horizonUrl = isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';

      const response = await axios.get<StellarResponse>(
        `${horizonUrl}/accounts/${payment.address}/payments`,
        { timeout: 10000 }
      );

      if (response.data._embedded?.records) {
        const expectedAmount = Number(payment.amount);
        const tolerance = expectedAmount * 0.01;

        for (const record of response.data._embedded.records) {
          if (record.type === 'payment' && record.to === payment.address) {
            const amount = Number(record.amount);
            if (amount >= expectedAmount - tolerance && amount <= expectedAmount + tolerance) {
              return {
                confirmed: true,
                transactionHash: record.transaction_hash,
                confirmations: 1,
              };
            }
          }
        }
      }

      return { confirmed: false };
    } catch (error) {
      console.error('Stellar payment check error:', error);
      return { confirmed: false, error: 'Failed to check Stellar payment' };
    }
  }
}

export default QRPaymentMonitorService;
