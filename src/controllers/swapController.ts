import { Request, Response } from 'express';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { UserAddress } from '../entities/UserAddress';
import { ChainType, NetworkType, AuthRequest } from '../types';
import { ethers } from 'ethers';
import CrossChainSwapService from '../services/crossChainSwapService';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function getZeroXBase(chain: string, network: string): string {
  const isTestnet = (network || 'mainnet').toLowerCase() !== 'mainnet';
  if (chain === 'ethereum') {
    return isTestnet ? (process.env.ZEROX_SEPOLIA_BASE || 'https://sepolia.api.0x.org') : (process.env.ZEROX_MAINNET_BASE || 'https://api.0x.org');
  }
  throw new Error(`0x aggregator not configured for chain: ${chain}`);
}

function getEthRpc(network: string): string {
  const isTestnet = (network || 'mainnet').toLowerCase() !== 'mainnet';
  if (isTestnet) {
    return process.env.ETH_SEPOLIA_RPC || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY || ''}`;
  }
  return process.env.ETH_MAINNET_RPC || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY || ''}`;
}

async function resolveTokenDecimals(chain: string, network: string, token: string, provider: ethers.JsonRpcProvider): Promise<number> {
  // ETH native
  if (token.toUpperCase() === 'ETH') return 18;
  // Address: use ERC20
  if (/^0x[a-fA-F0-9]{40}$/.test(token)) {
    try {
      const erc20 = new ethers.Contract(token, ERC20_ABI, provider);
      const d: number = await erc20.decimals();
      return Number(d);
    } catch {}
  }
  // Try 0x tokens endpoint for symbol metadata
  try {
    const base = getZeroXBase(chain, network);
    const resp = await axios.get(`${base}/swap/v1/tokens`, { timeout: 7000 });
    const data: any = resp.data as any;
    const tokens: any[] = Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data?.tokens)
      ? data.tokens
      : [];
    const match = tokens.find((t: any) => String(t.symbol || t.symbolName || '').toUpperCase() === token.toUpperCase());
    if (match && typeof match.decimals === 'number') return match.decimals;
  } catch {}
  // Fallback
  return 18;
}

async function pickUserEthAddress(userId: string, providerHint?: 'mainnet'|'testnet'): Promise<{ address: string; network: NetworkType } | null> {
  const addrRepo = AppDataSource.getRepository(UserAddress);
  const all = await addrRepo.find({ where: { userId, chain: 'ethereum' as ChainType } });
  if (!all || all.length === 0) return null;
  // Prefer hint, then mainnet, then first
  const byHint = providerHint ? all.find(a => a.network === providerHint) : undefined;
  if (byHint) return { address: byHint.address, network: byHint.network as NetworkType };
  const main = all.find(a => a.network === 'mainnet');
  if (main) return { address: main.address, network: 'mainnet' as NetworkType };
  return { address: all[0].address, network: all[0].network as NetworkType };
}

export class SwapController {
  // POST /swap/quote/simple
  // body: { fromToken: string, toToken: string, amount: string }
  static async getQuoteSimple(req: AuthRequest, res: Response) {
    try {
      const { fromToken, toToken, amount } = req.body || {};
      if (!fromToken || !toToken || !amount) {
        return res.status(400).json({ error: 'Missing fromToken, toToken or amount' });
      }
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const picked = await pickUserEthAddress(String(userId));
      if (!picked) return res.status(404).json({ error: 'No Ethereum address found for user' });
      const network = picked.network || 'mainnet';
      const provider = new ethers.JsonRpcProvider(getEthRpc(network));

      const decimals = await resolveTokenDecimals('ethereum', network, String(fromToken), provider);
      let sellAmount: string;
      try {
        sellAmount = ethers.parseUnits(String(amount), decimals).toString();
      } catch {
        return res.status(400).json({ error: 'Invalid amount format' });
      }

      const base = getZeroXBase('ethereum', network);
      const params: any = { sellToken: fromToken, buyToken: toToken, sellAmount, takerAddress: picked.address };
      const quoteUrl = `${base}/swap/v1/quote`;
      const resp = await axios.get(quoteUrl, { params, timeout: 12000 });
      return res.json({ quote: resp.data, context: { network, fromAddress: picked.address } });
    } catch (error: any) {
      const msg = error?.response?.data || error?.message || String(error);
      return res.status(500).json({ error: 'Failed to fetch quote', details: msg });
    }
  }
  // POST /swap/quote
  // body: { chain: 'ethereum', network: 'mainnet'|'testnet', sellToken: string, buyToken: string, sellAmount: string, takerAddress?: string, slippageBps?: number }
  static async getQuote(req: Request, res: Response) {
    try {
      const { chain = 'ethereum', network = 'mainnet', sellToken, buyToken, sellAmount, takerAddress, slippageBps } = req.body || {};
      if (!sellToken || !buyToken || !sellAmount) {
        return res.status(400).json({ error: 'Missing sellToken, buyToken or sellAmount' });
      }
      const base = getZeroXBase(chain, network);
      const params: any = {
        sellToken,
        buyToken,
        sellAmount,
      };
      if (takerAddress) params.takerAddress = takerAddress;
      if (slippageBps !== undefined) params.slippageBps = slippageBps;

      const quoteUrl = `${base}/swap/v1/quote`;
      const resp = await axios.get(quoteUrl, { params, timeout: 10000 });
      return res.json({ quote: resp.data });
    } catch (error: any) {
      const msg = error?.response?.data || error?.message || String(error);
      return res.status(500).json({ error: 'Failed to fetch quote', details: msg });
    }
  }

  // POST /swap/execute
  // body: { userId, fromAddress, chain:'ethereum', network, sellToken, buyToken, sellAmount, slippageBps? }
  static async execute(req: Request, res: Response) {
    try {
      const { userId, fromAddress, chain = 'ethereum', network = 'mainnet', sellToken, buyToken, sellAmount, slippageBps } = req.body || {};
      if (!userId || !fromAddress || !sellToken || !buyToken || !sellAmount) {
        return res.status(400).json({ error: 'Missing userId, fromAddress, sellToken, buyToken or sellAmount' });
      }
      if (chain !== 'ethereum') {
        return res.status(400).json({ error: `Chain ${chain} not yet supported for swaps` });
      }

      // Load user private key
  const addrRepo = AppDataSource.getRepository(UserAddress);
  const ua = await addrRepo.findOne({ where: { userId, address: fromAddress, chain: 'ethereum' as ChainType, network: network as NetworkType } });
      if (!ua || !ua.encryptedPrivateKey) {
        return res.status(404).json({ error: 'Sender address not found or no key stored' });
      }
      const { decrypt } = require('../utils/keygen');
      const privateKey: string = decrypt(ua.encryptedPrivateKey);

      const provider = new ethers.JsonRpcProvider(getEthRpc(network));
      const wallet = new ethers.Wallet(privateKey, provider);

      const base = getZeroXBase(chain, network);
      const params: any = {
        sellToken,
        buyToken,
        sellAmount,
        takerAddress: fromAddress,
      };
      if (slippageBps !== undefined) params.slippageBps = slippageBps;
      const quoteResp = await axios.get(`${base}/swap/v1/quote`, { params, timeout: 12000 });
      type ZeroXQuote = {
        to: string;
        data: string;
        value?: string;
        gas?: string | number;
        maxFeePerGas?: string | number;
        maxPriorityFeePerGas?: string | number;
        allowanceTarget?: string;
        sellAmount?: string;
        sellTokenAddress?: string;
        buyTokenAddress?: string;
      };
      const quote = quoteResp.data as ZeroXQuote;

      // If selling an ERC20, ensure allowance
      const isSellETH = (!quote.sellTokenAddress) || String(sellToken).toUpperCase() === 'ETH';
      if (!isSellETH) {
        const sellTokenAddr = String(sellToken);
        const allowanceTarget = quote.allowanceTarget as string | undefined;
        if (!allowanceTarget) {
          return res.status(500).json({ error: 'Missing allowanceTarget in quote' });
        }
        const erc20 = new ethers.Contract(sellTokenAddr, ERC20_ABI, wallet);
        const current = await erc20.allowance(fromAddress, allowanceTarget);
        const sellAmt = ethers.toBigInt((quote.sellAmount as string) || sellAmount);
        if (current < sellAmt) {
          const txApprove = await erc20.approve(allowanceTarget, sellAmt);
          await txApprove.wait(1);
        }
      }

      // Build and send swap tx
      const txRequest: ethers.TransactionRequest = {
        to: (quote as any).to,
        data: (quote as any).data,
        value: quote.value ? ethers.toBigInt(quote.value) : undefined,
        gasLimit: quote.gas ? ethers.toBigInt(quote.gas) : undefined,
        maxFeePerGas: quote.maxFeePerGas ? ethers.toBigInt(quote.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: quote.maxPriorityFeePerGas ? ethers.toBigInt(quote.maxPriorityFeePerGas) : undefined,
      };
      const sent = await wallet.sendTransaction(txRequest);
      const receipt = await sent.wait(1);

      // Store a Transaction record (best effort)
      try {
        const txRepo = AppDataSource.getRepository('Transaction');
        await txRepo.save({
          userId,
          type: 'send',
          amount: (quote.sellAmount as string) || sellAmount,
          chain: 'ethereum',
          network,
          fromAddress,
          toAddress: (quote as any).to,
          txHash: sent.hash,
          status: receipt?.status ? 'confirmed' : 'pending',
          createdAt: new Date(),
        });
      } catch {}

      return res.json({
        message: 'Swap executed',
        txHash: sent.hash,
        receipt,
        quote,
      });
    } catch (error: any) {
      const msg = error?.response?.data || error?.message || String(error);
      return res.status(500).json({ error: 'Swap execution failed', details: msg });
    }
  }

  // POST /swap/execute/simple
  // body: { fromToken: string, toToken: string, amount: string }
  static async executeSimple(req: AuthRequest, res: Response) {
    try {
      const { fromToken, toToken, amount } = req.body || {};
      if (!fromToken || !toToken || !amount) {
        return res.status(400).json({ error: 'Missing fromToken, toToken or amount' });
      }
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const picked = await pickUserEthAddress(String(userId));
      if (!picked) return res.status(404).json({ error: 'No Ethereum address found for user' });
      const network = picked.network || 'mainnet';

      // Load private key
      const addrRepo = AppDataSource.getRepository(UserAddress);
      const ua = await addrRepo.findOne({ where: { userId, address: picked.address, chain: 'ethereum' as ChainType, network: network as NetworkType } });
      if (!ua || !ua.encryptedPrivateKey) {
        return res.status(404).json({ error: 'Sender address not found or no key stored' });
      }
      const { decrypt } = require('../utils/keygen');
      const privateKey: string = decrypt(ua.encryptedPrivateKey);

      const provider = new ethers.JsonRpcProvider(getEthRpc(network));
      const wallet = new ethers.Wallet(privateKey, provider);

      const decimals = await resolveTokenDecimals('ethereum', network, String(fromToken), provider);
      let sellAmount: string;
      try { sellAmount = ethers.parseUnits(String(amount), decimals).toString(); } catch { return res.status(400).json({ error: 'Invalid amount format' }); }

      const base = getZeroXBase('ethereum', network);
      const params: any = { sellToken: fromToken, buyToken: toToken, sellAmount, takerAddress: picked.address };
      const quoteResp = await axios.get(`${base}/swap/v1/quote`, { params, timeout: 12000 });
      type ZeroXQuote = { to: string; data: string; value?: string; gas?: string|number; maxFeePerGas?: string|number; maxPriorityFeePerGas?: string|number; allowanceTarget?: string; sellAmount?: string; sellTokenAddress?: string };
      const quote = quoteResp.data as ZeroXQuote;

      // Approve if ERC20
      const isSellETH = (!quote.sellTokenAddress) || String(fromToken).toUpperCase() === 'ETH';
      if (!isSellETH) {
        const tokenAddr = quote.sellTokenAddress as string || (typeof fromToken === 'string' ? fromToken : '');
        if (tokenAddr && /^0x[a-fA-F0-9]{40}$/.test(tokenAddr)) {
          const allowanceTarget = quote.allowanceTarget as string | undefined;
          if (!allowanceTarget) return res.status(500).json({ error: 'Missing allowanceTarget in quote' });
          const erc20 = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
          const current = await erc20.allowance(picked.address, allowanceTarget);
          const sellAmt = ethers.toBigInt((quote.sellAmount as string) || sellAmount);
          if (current < sellAmt) {
            const txApprove = await erc20.approve(allowanceTarget, sellAmt);
            await txApprove.wait(1);
          }
        }
      }

      // Send swap tx
      const txRequest: ethers.TransactionRequest = {
        to: (quote as any).to,
        data: (quote as any).data,
        value: quote.value ? ethers.toBigInt(quote.value) : undefined,
        gasLimit: quote.gas ? ethers.toBigInt(quote.gas) : undefined,
        maxFeePerGas: quote.maxFeePerGas ? ethers.toBigInt(quote.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: quote.maxPriorityFeePerGas ? ethers.toBigInt(quote.maxPriorityFeePerGas) : undefined,
      };
      const sent = await wallet.sendTransaction(txRequest);
      const receipt = await sent.wait(1);

      // Record tx (best effort)
      try {
        const txRepo = AppDataSource.getRepository('Transaction');
        await txRepo.save({ userId, type: 'send', amount: (quote.sellAmount as string) || sellAmount, chain: 'ethereum', network, fromAddress: picked.address, toAddress: (quote as any).to, txHash: sent.hash, status: receipt?.status ? 'confirmed' : 'pending', createdAt: new Date() });
      } catch {}

      return res.json({ message: 'Swap executed', txHash: sent.hash, receipt, quote, context: { fromAddress: picked.address, network } });
    } catch (error: any) {
      const msg = error?.response?.data || error?.message || String(error);
      return res.status(500).json({ error: 'Swap execution failed', details: msg });
    }
  }

  // POST /swap/cross-chain/quote
  // body: { fromChain: string, toChain: string, amount: string }
  static async getCrossChainQuote(req: AuthRequest, res: Response) {
    try {
      const { fromChain, toChain, amount } = req.body || {};
      if (!fromChain || !toChain || !amount) {
        return res.status(400).json({ error: 'Missing fromChain, toChain or amount' });
      }

      if (!CrossChainSwapService.isCrossChainPair(fromChain, toChain)) {
        return res.status(400).json({ 
          error: 'Invalid cross-chain pair',
          supportedChains: CrossChainSwapService.getSupportedChains()
        });
      }

      // Get fixed-rate quote (more reliable for production)
      const quote = await CrossChainSwapService.getFixedRateQuote(fromChain, toChain, amount);
      
      return res.json({ 
        quote,
        message: 'Cross-chain quote fetched successfully',
      });
    } catch (error: any) {
      const msg = error?.message || String(error);
      return res.status(500).json({ error: 'Failed to fetch cross-chain quote', details: msg });
    }
  }

  // POST /swap/cross-chain/execute
  // body: { fromChain: string, toChain: string, amount: string, useFixedRate?: boolean }
  static async executeCrossChainSwap(req: AuthRequest, res: Response) {
    try {
      const { fromChain, toChain, amount, useFixedRate = true } = req.body || {};
      if (!fromChain || !toChain || !amount) {
        return res.status(400).json({ error: 'Missing fromChain, toChain or amount' });
      }

      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      if (!CrossChainSwapService.isCrossChainPair(fromChain, toChain)) {
        return res.status(400).json({ 
          error: 'Invalid cross-chain pair',
          supportedChains: CrossChainSwapService.getSupportedChains()
        });
      }

      // Get user's address for destination chain
      const addrRepo = AppDataSource.getRepository(UserAddress);
      const toAddresses = await addrRepo.find({ 
        where: { userId: String(userId), chain: toChain as ChainType } 
      });
      
      if (!toAddresses || toAddresses.length === 0) {
        return res.status(404).json({ 
          error: `No ${toChain} address found for user. Please add a ${toChain} wallet first.` 
        });
      }

      const recipientAddress = toAddresses[0].address;

      // Validate recipient address
      const validation = await CrossChainSwapService.validateAddress(toChain, recipientAddress);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid recipient address',
          details: validation.message 
        });
      }

      // Get refund address from source chain
      const fromAddresses = await addrRepo.find({ 
        where: { userId: String(userId), chain: fromChain as ChainType } 
      });
      const refundAddress = fromAddresses && fromAddresses.length > 0 ? fromAddresses[0].address : recipientAddress;

      let swapResult;

      if (useFixedRate) {
        // Step 1: Get fixed rate
        const quote = await CrossChainSwapService.getFixedRateQuote(fromChain, toChain, amount);
        if (!quote.transactionId) {
          return res.status(500).json({ error: 'No rate ID returned from quote' });
        }

        // Step 2: Create fixed-rate transaction
        swapResult = await CrossChainSwapService.createFixedRateTransaction(
          quote.transactionId,
          recipientAddress,
          refundAddress
        );
      } else {
        // Floating rate transaction
        swapResult = await CrossChainSwapService.createTransaction(
          fromChain,
          toChain,
          amount,
          recipientAddress,
          refundAddress
        );
      }

      // Store transaction record (best effort)
      try {
        const txRepo = AppDataSource.getRepository('Transaction');
        await txRepo.save({
          userId: String(userId),
          type: 'send',
          amount: swapResult.fromAmount,
          chain: fromChain,
          network: 'mainnet',
          fromAddress: refundAddress,
          toAddress: swapResult.payinAddress,
          txHash: swapResult.transactionId,
          status: 'pending',
          createdAt: new Date(),
        });
      } catch {}

      return res.json({
        message: 'Cross-chain swap initiated',
        swap: swapResult,
        instructions: `Send ${swapResult.fromAmount} ${swapResult.fromCurrency.toUpperCase()} to ${swapResult.payinAddress}`,
        note: 'Once received, Changelly will process and send to your destination address',
      });
    } catch (error: any) {
      const msg = error?.message || String(error);
      return res.status(500).json({ error: 'Cross-chain swap failed', details: msg });
    }
  }

  // GET /swap/cross-chain/status/:transactionId
  static async getCrossChainStatus(req: AuthRequest, res: Response) {
    try {
      const { transactionId } = req.params;
      if (!transactionId) {
        return res.status(400).json({ error: 'Missing transactionId' });
      }

      const status = await CrossChainSwapService.getTransactionStatus(transactionId);
      return res.json({ status });
    } catch (error: any) {
      const msg = error?.message || String(error);
      return res.status(500).json({ error: 'Failed to fetch swap status', details: msg });
    }
  }

  // GET /swap/supported-chains
  static async getSupportedChains(req: Request, res: Response) {
    try {
      const chains = CrossChainSwapService.getSupportedChains();
      const currencies = await CrossChainSwapService.getCurrencies();
      
      return res.json({
        supportedChains: chains,
        availableCurrencies: currencies,
        message: 'Cross-chain swaps available between any supported chain pairs'
      });
    } catch (error: any) {
      const msg = error?.message || String(error);
      return res.status(500).json({ error: 'Failed to fetch supported chains', details: msg });
    }
  }
}

export default SwapController;
