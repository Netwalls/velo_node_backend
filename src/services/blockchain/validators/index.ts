import axios from 'axios';

// Updated Type definitions for API responses
interface EthereumTransaction {
  result?: {
    to: string;
    value: string;
  };
}

interface BitcoinTransaction {
  vout?: Array<{
    scriptpubkey_address: string;
    value: number;
  }>;
}

// UPDATED: Correct Solana transaction interface
interface SolanaTransactionResponse {
  result?: {
    meta?: {
      postBalances: number[];
      preBalances: number[];
    };
    transaction: {
      message: {
        accountKeys: string[];
        instructions?: Array<{
          program?: string;
          parsed?: {
            type?: string;
            info?: {
              destination?: string;
              lamports?: number;
              source?: string;
            };
          };
        }>;
      };
    };
  };
}

interface StellarTransaction {
  successful: boolean;
  operations?: Array<{
    type: string;
    to: string;
    asset_type: string;
    amount: string;
  }>;
}

interface SubscanResponse {
  data?: {
    event?: Array<{
      event_id: string;
      params: string;
    }>;
  };
}

interface StarknetTransactionReceipt {
  result?: {
    events?: Array<{
      data: string[];
    }>;
  };
}

interface EthereumTransactionReceipt {
  result?: {
    logs?: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
  };
}

interface SubscanEventParam {
  name?: string;
  type?: string;
  value: string;
}

export class BlockchainValidator {
  private readonly AMOUNT_TOLERANCE_PERCENT = 0.01;

  /**
   * Validate Ethereum transaction using Etherscan API (Goerli Testnet)
   */
  async validateEthereumTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('Etherscan API key not configured');
    }

    // Using Goerli testnet
    const url = `https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;
    
    try {
      const response = await axios.get<EthereumTransaction>(url);
      const data = response.data;

      if (!data.result) {
        console.error('Ethereum transaction not found');
        return false;
      }

      const tx = data.result;
      const actualTo = tx.to;
      const actualAmount = parseInt(tx.value, 16) / 1e18; // Convert from wei to ETH

      console.log(`   Ethereum Testnet TX: ${actualAmount} ETH to ${actualTo}`);

      return (
        actualTo.toLowerCase() === expectedTo.toLowerCase() &&
        actualAmount >= minAmount &&
        actualAmount <= maxAmount
      );
    } catch (error) {
      console.error('Ethereum validation error:', error);
      return false;
    }
  }

  /**
   * Validate Bitcoin transaction using Blockchain.com API (Testnet)
   */
  async validateBitcoinTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    // Using Bitcoin testnet
    const url = `https://blockstream.info/testnet/api/tx/${txHash}`;
    
    try {
      const response = await axios.get<BitcoinTransaction>(url);
      const tx = response.data;

      if (!tx.vout) {
        console.error('Bitcoin transaction not found');
        return false;
      }

      // Find output that matches our expected address
      const targetOutput = tx.vout.find((output) => 
        output.scriptpubkey_address === expectedTo
      );

      if (!targetOutput) {
        console.error('Target address not found in transaction outputs');
        return false;
      }

      const actualAmount = targetOutput.value / 1e8; // Convert from satoshis to BTC

      console.log(`   Bitcoin Testnet TX: ${actualAmount} BTC to ${expectedTo}`);

      return actualAmount >= minAmount && actualAmount <= maxAmount;
    } catch (error) {
      console.error('Bitcoin validation error:', error);
      return false;
    }
  }

  /**
   * Validate Solana transaction using Solana RPC (Devnet)
   */
  async validateSolanaTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    
    try {
      console.log(`🔍 [DEBUG] Fetching Solana transaction: ${txHash}`);
      
      const response = await axios.post<SolanaTransactionResponse>(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          txHash, 
          { 
            encoding: 'jsonParsed', 
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          }
        ]
      });

      const data = response.data;

      if (!data.result) {
        console.error('❌ Solana transaction not found');
        return false;
      }

      const tx = data.result;
      console.log(`🔍 [DEBUG] Transaction found, analyzing transfers...`);

      let totalAmount = 0;
      let foundTransfer = false;

      // Method 1: Check transaction instructions for transfers
      if (tx.transaction?.message?.instructions) {
        const instructions = tx.transaction.message.instructions;
        
        for (const instruction of instructions) {
          // Look for system program transfers
          if (instruction.parsed?.type === 'transfer' && instruction.parsed.info) {
            const transferInfo = instruction.parsed.info;
            
            console.log(`🔍 [DEBUG] Found transfer instruction:`, transferInfo);
            
            if (transferInfo.destination === expectedTo && transferInfo.lamports) {
              const amount = transferInfo.lamports / 1e9; // Convert lamports to SOL
              totalAmount += amount;
              foundTransfer = true;
              console.log(`✅ [DEBUG] Valid transfer: ${amount} SOL to ${expectedTo}`);
            }
          }
        }
      }

      // Method 2: Check balance changes as fallback
      if (!foundTransfer && tx.meta?.postBalances && tx.transaction.message.accountKeys) {
        console.log(`🔍 [DEBUG] No transfer instructions found, checking balance changes...`);
        
        const accountKeys = tx.transaction.message.accountKeys;
        const postBalances = tx.meta.postBalances;
        const preBalances = tx.meta.preBalances || [];

        for (let i = 0; i < accountKeys.length; i++) {
          if (accountKeys[i] === expectedTo) {
            const preBalance = preBalances[i] || 0;
            const postBalance = postBalances[i] || 0;
            const balanceChange = (postBalance - preBalance) / 1e9;
            
            console.log(`🔍 [DEBUG] Balance change for ${expectedTo}: ${balanceChange} SOL`);
            
            if (balanceChange > 0) {
              totalAmount = balanceChange;
              foundTransfer = true;
              break;
            }
          }
        }
      }

      console.log(`🔍 [DEBUG] Validation result:`);
      console.log(`   - Found transfer: ${foundTransfer}`);
      console.log(`   - Total amount: ${totalAmount} SOL`);
      console.log(`   - Expected range: ${minAmount} - ${maxAmount} SOL`);
      console.log(`   - Validation: ${foundTransfer && totalAmount >= minAmount && totalAmount <= maxAmount}`);

      return foundTransfer && totalAmount >= minAmount && totalAmount <= maxAmount;
    } catch (error) {
      console.error('❌ Solana validation error:', error);
      return false;
    }
  }

  /**
   * Validate Stellar transaction using Horizon API (Testnet)
   */
  async validateStellarTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    // Using Stellar testnet
    const url = `https://horizon-testnet.stellar.org/transactions/${txHash}`;
    
    try {
      const response = await axios.get<StellarTransaction>(url);
      const data = response.data;

      if (!data.successful) {
        console.error('Stellar transaction not found or failed');
        return false;
      }

      let totalAmount = 0;
      const operations = data.operations || [];

      // Sum all payments to our address
      for (const op of operations) {
        if (op.type === 'payment' && 
            op.to === expectedTo && 
            op.asset_type === 'native') {
          totalAmount += parseFloat(op.amount);
        }
      }

      console.log(`   Stellar Testnet TX: ${totalAmount} XLM to ${expectedTo}`);

      return totalAmount >= minAmount && totalAmount <= maxAmount;
    } catch (error) {
      console.error('Stellar validation error:', error);
      return false;
    }
  }

  /**
   * Validate Polkadot transaction using Subscan API (Westend Testnet)
   */
  async validatePolkadotTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    const apiKey = process.env.SUBSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('Subscan API key not configured');
    }

    // Using Polkadot Westend testnet
    const url = 'https://westend.api.subscan.io/api/scan/extrinsic';
    
    try {
      const response = await axios.post<SubscanResponse>(url, {
        hash: txHash
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        }
      });

      const data = response.data;

      if (!data.data) {
        console.error('Polkadot transaction not found');
        return false;
      }

      const tx = data.data;
      let totalAmount = 0;

      // Parse transfer events
      if (tx.event && Array.isArray(tx.event)) {
        for (const event of tx.event) {
          if (event.event_id === 'Transfer' && event.params) {
            try {
              const params: SubscanEventParam[] = JSON.parse(event.params);
              const toParam = params.find((p) => p.name === 'to' || p.type === 'AccountId');
              const valueParam = params.find((p) => p.name === 'value' || p.type === 'Balance');
              
              if (toParam && valueParam && toParam.value === expectedTo) {
                totalAmount += parseFloat(valueParam.value) / 1e12; // Convert from Planck to WND (Westend)
              }
            } catch (parseError) {
              console.error('Error parsing Polkadot event params:', parseError);
              continue;
            }
          }
        }
      }

      console.log(`   Polkadot Westend TX: ${totalAmount} WND to ${expectedTo}`);

      return totalAmount >= minAmount && totalAmount <= maxAmount;
    } catch (error) {
      console.error('Polkadot validation error:', error);
      return false;
    }
  }

  /**
   * Validate Starknet transaction using Starknet API (Goerli Testnet)
   */
  async validateStarknetTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    // Using Starknet testnet (Goerli)
    const rpcUrl = process.env.STARKNET_RPC_URL || 'https://starknet-testnet.public.blastapi.io';
    
    try {
      const response = await axios.post<StarknetTransactionReceipt>(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'starknet_getTransactionReceipt',
        params: [txHash]
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = response.data;

      if (!data.result) {
        console.error('Starknet transaction not found');
        return false;
      }

      const receipt = data.result;
      let totalAmount = 0;

      // For Starknet, we need to check transfer events
      if (receipt.events) {
        for (const event of receipt.events) {
          // Look for transfer events
          if (event.data && event.data.length >= 3) {
            const from = event.data[0];
            const to = event.data[1];
            const amount = event.data[2];
            
            if (to === expectedTo) {
              totalAmount += parseInt(amount, 16) / 1e18; // Convert from wei
            }
          }
        }
      }

      console.log(`   Starknet Testnet TX: ${totalAmount} STRK to ${expectedTo}`);

      return totalAmount >= minAmount && totalAmount <= maxAmount;
    } catch (error) {
      console.error('Starknet validation error:', error);
      return false;
    }
  }

  /**
   * Validate USDT ERC-20 transaction using Etherscan (Goerli Testnet)
   */
  async validateUsdtTransaction(
    txHash: string,
    expectedTo: string,
    minAmount: number,
    maxAmount: number
  ): Promise<boolean> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('Etherscan API key not configured');
    }

    // USDT contract address on Ethereum Goerli testnet
    // Note: You may need to deploy your own test USDT contract on Goerli
    const usdtContract = process.env.USDT_TESTNET_CONTRACT || '0x509Ee0d083DdF8AC028f2a56731412edD63223B9';
    
    // Using Goerli testnet
    const url = `https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;
    
    try {
      const response = await axios.get<EthereumTransactionReceipt>(url);
      const data = response.data;

      if (!data.result) {
        console.error('USDT transaction not found');
        return false;
      }

      const receipt = data.result;
      let totalAmount = 0;

      // Parse transfer logs
      if (receipt.logs) {
        for (const log of receipt.logs) {
          // USDT Transfer event signature
          if (log.address.toLowerCase() === usdtContract.toLowerCase() && 
              log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            
            // topics[1] = from, topics[2] = to
            const toAddress = '0x' + log.topics[2].slice(26);
            
            if (toAddress.toLowerCase() === expectedTo.toLowerCase()) {
              const amount = parseInt(log.data, 16) / 1e6; // USDT has 6 decimals
              totalAmount += amount;
            }
          }
        }
      }

      console.log(`   USDT Testnet TX: ${totalAmount} USDT to ${expectedTo}`);

      return totalAmount >= minAmount && totalAmount <= maxAmount;
    } catch (error) {
      console.error('USDT validation error:', error);
      return false;
    }
  }
}

export const blockchainValidator = new BlockchainValidator();