"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapController = void 0;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const UserAddress_1 = require("../entities/UserAddress");
const ethers_1 = require("ethers");
const crossChainSwapService_1 = __importDefault(require("../services/crossChainSwapService"));
const ERC20_ABI = [
    'function decimals() view returns (uint8)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
];
function getZeroXBase(chain, network) {
    const isTestnet = (network || 'mainnet').toLowerCase() !== 'mainnet';
    if (chain === 'ethereum') {
        return isTestnet ? (process.env.ZEROX_SEPOLIA_BASE || 'https://sepolia.api.0x.org') : (process.env.ZEROX_MAINNET_BASE || 'https://api.0x.org');
    }
    throw new Error(`0x aggregator not configured for chain: ${chain}`);
}
function getEthRpc(network) {
    const isTestnet = (network || 'mainnet').toLowerCase() !== 'mainnet';
    if (isTestnet) {
        return process.env.ETH_SEPOLIA_RPC || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY || ''}`;
    }
    return process.env.ETH_MAINNET_RPC || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY || ''}`;
}
async function resolveTokenDecimals(chain, network, token, provider) {
    // ETH native
    if (token.toUpperCase() === 'ETH')
        return 18;
    // Address: use ERC20
    if (/^0x[a-fA-F0-9]{40}$/.test(token)) {
        try {
            const erc20 = new ethers_1.ethers.Contract(token, ERC20_ABI, provider);
            const d = await erc20.decimals();
            return Number(d);
        }
        catch { }
    }
    // Try 0x tokens endpoint for symbol metadata
    try {
        const base = getZeroXBase(chain, network);
        const resp = await axios_1.default.get(`${base}/swap/v1/tokens`, { timeout: 7000 });
        const data = resp.data;
        const tokens = Array.isArray(data?.records)
            ? data.records
            : Array.isArray(data?.tokens)
                ? data.tokens
                : [];
        const match = tokens.find((t) => String(t.symbol || t.symbolName || '').toUpperCase() === token.toUpperCase());
        if (match && typeof match.decimals === 'number')
            return match.decimals;
    }
    catch { }
    // Fallback
    return 18;
}
async function pickUserEthAddress(userId, providerHint) {
    const addrRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
    const all = await addrRepo.find({ where: { userId, chain: 'ethereum' } });
    if (!all || all.length === 0)
        return null;
    // Prefer hint, then mainnet, then first
    const byHint = providerHint ? all.find(a => a.network === providerHint) : undefined;
    if (byHint)
        return { address: byHint.address, network: byHint.network };
    const main = all.find(a => a.network === 'mainnet');
    if (main)
        return { address: main.address, network: 'mainnet' };
    return { address: all[0].address, network: all[0].network };
}
class SwapController {
    // POST /swap/quote/simple
    // body: { fromToken: string, toToken: string, amount: string }
    static async getQuoteSimple(req, res) {
        try {
            const { fromToken, toToken, amount } = req.body || {};
            if (!fromToken || !toToken || !amount) {
                return res.status(400).json({ error: 'Missing fromToken, toToken or amount' });
            }
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const picked = await pickUserEthAddress(String(userId));
            if (!picked)
                return res.status(404).json({ error: 'No Ethereum address found for user' });
            const network = picked.network || 'mainnet';
            const provider = new ethers_1.ethers.JsonRpcProvider(getEthRpc(network));
            const decimals = await resolveTokenDecimals('ethereum', network, String(fromToken), provider);
            let sellAmount;
            try {
                sellAmount = ethers_1.ethers.parseUnits(String(amount), decimals).toString();
            }
            catch {
                return res.status(400).json({ error: 'Invalid amount format' });
            }
            const base = getZeroXBase('ethereum', network);
            const params = { sellToken: fromToken, buyToken: toToken, sellAmount, takerAddress: picked.address };
            const quoteUrl = `${base}/swap/v1/quote`;
            const resp = await axios_1.default.get(quoteUrl, { params, timeout: 12000 });
            return res.json({ quote: resp.data, context: { network, fromAddress: picked.address } });
        }
        catch (error) {
            const msg = error?.response?.data || error?.message || String(error);
            return res.status(500).json({ error: 'Failed to fetch quote', details: msg });
        }
    }
    // POST /swap/quote
    // body: { chain: 'ethereum', network: 'mainnet'|'testnet', sellToken: string, buyToken: string, sellAmount: string, takerAddress?: string, slippageBps?: number }
    static async getQuote(req, res) {
        try {
            const { chain = 'ethereum', network = 'mainnet', sellToken, buyToken, sellAmount, takerAddress, slippageBps } = req.body || {};
            if (!sellToken || !buyToken || !sellAmount) {
                return res.status(400).json({ error: 'Missing sellToken, buyToken or sellAmount' });
            }
            const base = getZeroXBase(chain, network);
            const params = {
                sellToken,
                buyToken,
                sellAmount,
            };
            if (takerAddress)
                params.takerAddress = takerAddress;
            if (slippageBps !== undefined)
                params.slippageBps = slippageBps;
            const quoteUrl = `${base}/swap/v1/quote`;
            const resp = await axios_1.default.get(quoteUrl, { params, timeout: 10000 });
            return res.json({ quote: resp.data });
        }
        catch (error) {
            const msg = error?.response?.data || error?.message || String(error);
            return res.status(500).json({ error: 'Failed to fetch quote', details: msg });
        }
    }
    // POST /swap/execute
    // body: { userId, fromAddress, chain:'ethereum', network, sellToken, buyToken, sellAmount, slippageBps? }
    static async execute(req, res) {
        try {
            const { userId, fromAddress, chain = 'ethereum', network = 'mainnet', sellToken, buyToken, sellAmount, slippageBps } = req.body || {};
            if (!userId || !fromAddress || !sellToken || !buyToken || !sellAmount) {
                return res.status(400).json({ error: 'Missing userId, fromAddress, sellToken, buyToken or sellAmount' });
            }
            if (chain !== 'ethereum') {
                return res.status(400).json({ error: `Chain ${chain} not yet supported for swaps` });
            }
            // Load user private key
            const addrRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
            const ua = await addrRepo.findOne({ where: { userId, address: fromAddress, chain: 'ethereum', network: network } });
            if (!ua || !ua.encryptedPrivateKey) {
                return res.status(404).json({ error: 'Sender address not found or no key stored' });
            }
            const { decrypt } = require('../utils/keygen');
            const privateKey = decrypt(ua.encryptedPrivateKey);
            const provider = new ethers_1.ethers.JsonRpcProvider(getEthRpc(network));
            const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            const base = getZeroXBase(chain, network);
            const params = {
                sellToken,
                buyToken,
                sellAmount,
                takerAddress: fromAddress,
            };
            if (slippageBps !== undefined)
                params.slippageBps = slippageBps;
            const quoteResp = await axios_1.default.get(`${base}/swap/v1/quote`, { params, timeout: 12000 });
            const quote = quoteResp.data;
            // If selling an ERC20, ensure allowance
            const isSellETH = (!quote.sellTokenAddress) || String(sellToken).toUpperCase() === 'ETH';
            if (!isSellETH) {
                const sellTokenAddr = String(sellToken);
                const allowanceTarget = quote.allowanceTarget;
                if (!allowanceTarget) {
                    return res.status(500).json({ error: 'Missing allowanceTarget in quote' });
                }
                const erc20 = new ethers_1.ethers.Contract(sellTokenAddr, ERC20_ABI, wallet);
                const current = await erc20.allowance(fromAddress, allowanceTarget);
                const sellAmt = ethers_1.ethers.toBigInt(quote.sellAmount || sellAmount);
                if (current < sellAmt) {
                    const txApprove = await erc20.approve(allowanceTarget, sellAmt);
                    await txApprove.wait(1);
                }
            }
            // Build and send swap tx
            const txRequest = {
                to: quote.to,
                data: quote.data,
                value: quote.value ? ethers_1.ethers.toBigInt(quote.value) : undefined,
                gasLimit: quote.gas ? ethers_1.ethers.toBigInt(quote.gas) : undefined,
                maxFeePerGas: quote.maxFeePerGas ? ethers_1.ethers.toBigInt(quote.maxFeePerGas) : undefined,
                maxPriorityFeePerGas: quote.maxPriorityFeePerGas ? ethers_1.ethers.toBigInt(quote.maxPriorityFeePerGas) : undefined,
            };
            const sent = await wallet.sendTransaction(txRequest);
            const receipt = await sent.wait(1);
            // Store a Transaction record (best effort)
            try {
                const txRepo = database_1.AppDataSource.getRepository('Transaction');
                await txRepo.save({
                    userId,
                    type: 'send',
                    amount: quote.sellAmount || sellAmount,
                    chain: 'ethereum',
                    network,
                    fromAddress,
                    toAddress: quote.to,
                    txHash: sent.hash,
                    status: receipt?.status ? 'confirmed' : 'pending',
                    createdAt: new Date(),
                });
            }
            catch { }
            return res.json({
                message: 'Swap executed',
                txHash: sent.hash,
                receipt,
                quote,
            });
        }
        catch (error) {
            const msg = error?.response?.data || error?.message || String(error);
            return res.status(500).json({ error: 'Swap execution failed', details: msg });
        }
    }
    // POST /swap/execute/simple
    // body: { fromToken: string, toToken: string, amount: string }
    static async executeSimple(req, res) {
        try {
            const { fromToken, toToken, amount } = req.body || {};
            if (!fromToken || !toToken || !amount) {
                return res.status(400).json({ error: 'Missing fromToken, toToken or amount' });
            }
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const picked = await pickUserEthAddress(String(userId));
            if (!picked)
                return res.status(404).json({ error: 'No Ethereum address found for user' });
            const network = picked.network || 'mainnet';
            // Load private key
            const addrRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
            const ua = await addrRepo.findOne({ where: { userId, address: picked.address, chain: 'ethereum', network: network } });
            if (!ua || !ua.encryptedPrivateKey) {
                return res.status(404).json({ error: 'Sender address not found or no key stored' });
            }
            const { decrypt } = require('../utils/keygen');
            const privateKey = decrypt(ua.encryptedPrivateKey);
            const provider = new ethers_1.ethers.JsonRpcProvider(getEthRpc(network));
            const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            const decimals = await resolveTokenDecimals('ethereum', network, String(fromToken), provider);
            let sellAmount;
            try {
                sellAmount = ethers_1.ethers.parseUnits(String(amount), decimals).toString();
            }
            catch {
                return res.status(400).json({ error: 'Invalid amount format' });
            }
            const base = getZeroXBase('ethereum', network);
            const params = { sellToken: fromToken, buyToken: toToken, sellAmount, takerAddress: picked.address };
            const quoteResp = await axios_1.default.get(`${base}/swap/v1/quote`, { params, timeout: 12000 });
            const quote = quoteResp.data;
            // Approve if ERC20
            const isSellETH = (!quote.sellTokenAddress) || String(fromToken).toUpperCase() === 'ETH';
            if (!isSellETH) {
                const tokenAddr = quote.sellTokenAddress || (typeof fromToken === 'string' ? fromToken : '');
                if (tokenAddr && /^0x[a-fA-F0-9]{40}$/.test(tokenAddr)) {
                    const allowanceTarget = quote.allowanceTarget;
                    if (!allowanceTarget)
                        return res.status(500).json({ error: 'Missing allowanceTarget in quote' });
                    const erc20 = new ethers_1.ethers.Contract(tokenAddr, ERC20_ABI, wallet);
                    const current = await erc20.allowance(picked.address, allowanceTarget);
                    const sellAmt = ethers_1.ethers.toBigInt(quote.sellAmount || sellAmount);
                    if (current < sellAmt) {
                        const txApprove = await erc20.approve(allowanceTarget, sellAmt);
                        await txApprove.wait(1);
                    }
                }
            }
            // Send swap tx
            const txRequest = {
                to: quote.to,
                data: quote.data,
                value: quote.value ? ethers_1.ethers.toBigInt(quote.value) : undefined,
                gasLimit: quote.gas ? ethers_1.ethers.toBigInt(quote.gas) : undefined,
                maxFeePerGas: quote.maxFeePerGas ? ethers_1.ethers.toBigInt(quote.maxFeePerGas) : undefined,
                maxPriorityFeePerGas: quote.maxPriorityFeePerGas ? ethers_1.ethers.toBigInt(quote.maxPriorityFeePerGas) : undefined,
            };
            const sent = await wallet.sendTransaction(txRequest);
            const receipt = await sent.wait(1);
            // Record tx (best effort)
            try {
                const txRepo = database_1.AppDataSource.getRepository('Transaction');
                await txRepo.save({ userId, type: 'send', amount: quote.sellAmount || sellAmount, chain: 'ethereum', network, fromAddress: picked.address, toAddress: quote.to, txHash: sent.hash, status: receipt?.status ? 'confirmed' : 'pending', createdAt: new Date() });
            }
            catch { }
            return res.json({ message: 'Swap executed', txHash: sent.hash, receipt, quote, context: { fromAddress: picked.address, network } });
        }
        catch (error) {
            const msg = error?.response?.data || error?.message || String(error);
            return res.status(500).json({ error: 'Swap execution failed', details: msg });
        }
    }
    // POST /swap/cross-chain/quote
    // body: { fromChain: string, toChain: string, amount: string }
    static async getCrossChainQuote(req, res) {
        try {
            const { fromChain, toChain, amount } = req.body || {};
            if (!fromChain || !toChain || !amount) {
                return res.status(400).json({ error: 'Missing fromChain, toChain or amount' });
            }
            if (!crossChainSwapService_1.default.isCrossChainPair(fromChain, toChain)) {
                return res.status(400).json({
                    error: 'Invalid cross-chain pair',
                    supportedChains: crossChainSwapService_1.default.getSupportedChains()
                });
            }
            // Get fixed-rate quote (more reliable for production)
            const quote = await crossChainSwapService_1.default.getFixedRateQuote(fromChain, toChain, amount);
            return res.json({
                quote,
                message: 'Cross-chain quote fetched successfully',
            });
        }
        catch (error) {
            const msg = error?.message || String(error);
            return res.status(500).json({ error: 'Failed to fetch cross-chain quote', details: msg });
        }
    }
    // POST /swap/cross-chain/execute
    // body: { fromChain: string, toChain: string, amount: string, useFixedRate?: boolean }
    static async executeCrossChainSwap(req, res) {
        try {
            const { fromChain, toChain, amount, useFixedRate = true } = req.body || {};
            if (!fromChain || !toChain || !amount) {
                return res.status(400).json({ error: 'Missing fromChain, toChain or amount' });
            }
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            if (!crossChainSwapService_1.default.isCrossChainPair(fromChain, toChain)) {
                return res.status(400).json({
                    error: 'Invalid cross-chain pair',
                    supportedChains: crossChainSwapService_1.default.getSupportedChains()
                });
            }
            // Get user's address for destination chain
            const addrRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
            const toAddresses = await addrRepo.find({
                where: { userId: String(userId), chain: toChain }
            });
            if (!toAddresses || toAddresses.length === 0) {
                return res.status(404).json({
                    error: `No ${toChain} address found for user. Please add a ${toChain} wallet first.`
                });
            }
            const recipientAddress = toAddresses[0].address;
            // Validate recipient address
            const validation = await crossChainSwapService_1.default.validateAddress(toChain, recipientAddress);
            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Invalid recipient address',
                    details: validation.message
                });
            }
            // Get refund address from source chain
            const fromAddresses = await addrRepo.find({
                where: { userId: String(userId), chain: fromChain }
            });
            const refundAddress = fromAddresses && fromAddresses.length > 0 ? fromAddresses[0].address : recipientAddress;
            let swapResult;
            if (useFixedRate) {
                // Step 1: Get fixed rate
                const quote = await crossChainSwapService_1.default.getFixedRateQuote(fromChain, toChain, amount);
                if (!quote.transactionId) {
                    return res.status(500).json({ error: 'No rate ID returned from quote' });
                }
                // Step 2: Create fixed-rate transaction
                swapResult = await crossChainSwapService_1.default.createFixedRateTransaction(quote.transactionId, recipientAddress, refundAddress);
            }
            else {
                // Floating rate transaction
                swapResult = await crossChainSwapService_1.default.createTransaction(fromChain, toChain, amount, recipientAddress, refundAddress);
            }
            // Store transaction record (best effort)
            try {
                const txRepo = database_1.AppDataSource.getRepository('Transaction');
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
            }
            catch { }
            return res.json({
                message: 'Cross-chain swap initiated',
                swap: swapResult,
                instructions: `Send ${swapResult.fromAmount} ${swapResult.fromCurrency.toUpperCase()} to ${swapResult.payinAddress}`,
                note: 'Once received, Changelly will process and send to your destination address',
            });
        }
        catch (error) {
            const msg = error?.message || String(error);
            return res.status(500).json({ error: 'Cross-chain swap failed', details: msg });
        }
    }
    // GET /swap/cross-chain/status/:transactionId
    static async getCrossChainStatus(req, res) {
        try {
            const { transactionId } = req.params;
            if (!transactionId) {
                return res.status(400).json({ error: 'Missing transactionId' });
            }
            const status = await crossChainSwapService_1.default.getTransactionStatus(transactionId);
            return res.json({ status });
        }
        catch (error) {
            const msg = error?.message || String(error);
            return res.status(500).json({ error: 'Failed to fetch swap status', details: msg });
        }
    }
    // GET /swap/supported-chains
    static async getSupportedChains(req, res) {
        try {
            const chains = crossChainSwapService_1.default.getSupportedChains();
            const currencies = await crossChainSwapService_1.default.getCurrencies();
            return res.json({
                supportedChains: chains,
                availableCurrencies: currencies,
                message: 'Cross-chain swaps available between any supported chain pairs'
            });
        }
        catch (error) {
            const msg = error?.message || String(error);
            return res.status(500).json({ error: 'Failed to fetch supported chains', details: msg });
        }
    }
}
exports.SwapController = SwapController;
exports.default = SwapController;
//# sourceMappingURL=swapController.js.map