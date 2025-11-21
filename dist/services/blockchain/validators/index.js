"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainValidator = exports.BlockchainValidator = void 0;
const axios_1 = __importDefault(require("axios"));
class BlockchainValidator {
    constructor() {
        this.AMOUNT_TOLERANCE_PERCENT = 0.01;
    }
    async validateSolanaTransaction(txHash, expectedTo, minAmount, maxAmount) {
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        try {
            console.log(`🔍 [DEBUG] Fetching Solana transaction: ${txHash}`);
            const response = await axios_1.default.post(rpcUrl, {
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
        }
        catch (error) {
            console.error('❌ Solana validation error:', error);
            return false;
        }
    }
    async validateEthereumTransaction(txHash, expectedTo, minAmount, maxAmount) {
        const rpcEndpoints = [
            'https://eth-sepolia.g.alchemy.com/v2/demo',
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://rpc.sepolia.org'
        ];
        for (const endpoint of rpcEndpoints) {
            try {
                console.log(`🔍 [ETH] Trying: ${endpoint.split('/')[2]}`);
                const response = await axios_1.default.post(endpoint, {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_getTransactionByHash",
                    params: [txHash]
                }, {
                    timeout: 10000,
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = response.data;
                if (data.error || !data.result) {
                    continue; // Try next endpoint
                }
                const tx = data.result;
                if (!tx.to)
                    return false;
                const actualTo = tx.to.toLowerCase();
                const actualAmount = parseInt(tx.value || '0', 16) / 1e18;
                console.log(`✅ [ETH] ${actualAmount} ETH to ${actualTo}`);
                return actualTo === expectedTo.toLowerCase() &&
                    actualAmount >= minAmount &&
                    actualAmount <= maxAmount;
            }
            catch (error) {
                continue; // Try next endpoint
            }
        }
        console.error('❌ [ETH] All endpoints failed');
        return false;
    }
    /**
     * Validate Bitcoin transaction using Blockchain.com API (Testnet)
     */
    async validateBitcoinTransaction(txHash, expectedTo, minAmount, maxAmount) {
        // Using Bitcoin testnet
        const url = `https://blockstream.info/testnet/api/tx/${txHash}`;
        try {
            const response = await axios_1.default.get(url);
            const tx = response.data;
            if (!tx.vout) {
                console.error('Bitcoin transaction not found');
                return false;
            }
            // Find output that matches our expected address
            const targetOutput = tx.vout.find((output) => output.scriptpubkey_address === expectedTo);
            if (!targetOutput) {
                console.error('Target address not found in transaction outputs');
                return false;
            }
            const actualAmount = targetOutput.value / 1e8; // Convert from satoshis to BTC
            console.log(`   Bitcoin Testnet TX: ${actualAmount} BTC to ${expectedTo}`);
            return actualAmount >= minAmount && actualAmount <= maxAmount;
        }
        catch (error) {
            console.error('Bitcoin validation error:', error);
            return false;
        }
    }
    /**
     * Validate Stellar transaction using Horizon API (Testnet)
     */
    async validateStellarTransaction(txHash, expectedTo, minAmount, maxAmount) {
        const endpoints = [
            'https://horizon-testnet.stellar.org',
            'https://horizon.stellar.org'
        ];
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 [XLM] Trying: ${endpoint.split('/')[2]}`);
                console.log(`   TX: ${txHash}`);
                console.log(`   Expected: ${minAmount}-${maxAmount} XLM to ${expectedTo}`);
                // Step 1: Get the main transaction
                const txUrl = `${endpoint}/transactions/${txHash}`;
                const txResponse = await axios_1.default.get(txUrl, {
                    timeout: 10000
                });
                const txData = txResponse.data;
                console.log(`✅ [XLM] Transaction found:`);
                console.log(`   - Successful: ${txData.successful}`);
                console.log(`   - Source: ${txData.source_account}`);
                console.log(`   - Operation Count: ${txData.operation_count}`);
                console.log(`   - Ledger: ${txData.ledger}`);
                if (!txData.successful) {
                    console.error('   ❌ Transaction was not successful');
                    continue;
                }
                if (txData.operation_count === 0) {
                    console.error('   ❌ No operations in transaction');
                    continue;
                }
                // Step 2: Fetch operations from the separate operations endpoint
                console.log(`   🔍 Fetching ${txData.operation_count} operations...`);
                const operationsUrl = `${endpoint}/transactions/${txHash}/operations`;
                const operationsResponse = await axios_1.default.get(operationsUrl, {
                    timeout: 10000
                });
                const operationsData = operationsResponse.data;
                const operations = operationsData._embedded?.records || [];
                console.log(`   ✅ Found ${operations.length} operations`);
                let totalAmount = 0;
                let foundTransfer = false;
                // Analyze all operations
                for (const op of operations) {
                    console.log(`      Operation: ${op.type}`);
                    console.log(`        From: ${op.from}`);
                    console.log(`        To: ${op.to}`);
                    console.log(`        Asset: ${op.asset_type}${op.asset_code ? ` ${op.asset_code}` : ''}`);
                    console.log(`        Amount: ${op.amount}`);
                    // Check if this operation sends XLM to our expected address
                    if (op.type === 'payment' && op.to === expectedTo && op.asset_type === 'native') {
                        const amount = parseFloat(op.amount);
                        totalAmount += amount;
                        foundTransfer = true;
                        console.log(`      ✅ VALID TRANSFER: ${amount} XLM to ${op.to}`);
                    }
                    else if (op.to === expectedTo) {
                        console.log(`      ❌ Wrong type/asset: ${op.type}, ${op.asset_type}`);
                    }
                    else {
                        console.log(`      ❌ Wrong recipient: expected ${expectedTo}, got ${op.to}`);
                    }
                }
                if (foundTransfer) {
                    const isValid = totalAmount >= minAmount && totalAmount <= maxAmount;
                    console.log(`📊 [XLM] Summary: ${totalAmount} XLM to ${expectedTo}`);
                    console.log(`   - Expected range: ${minAmount}-${maxAmount} XLM`);
                    console.log(`   - Validation: ${isValid ? 'SUCCESS' : 'FAILED'}`);
                    return isValid;
                }
                else {
                    console.error(`   ❌ No XLM payments found to ${expectedTo}`);
                }
            }
            catch (error) {
                if (error.response?.status === 404) {
                    console.error(`   ❌ Transaction not found: ${txHash}`);
                }
                else {
                    console.error(`   ❌ Endpoint failed: ${error.message}`);
                }
                continue;
            }
        }
        console.error('❌ [XLM] All endpoints failed');
        return false;
    }
    /**
     * Validate Polkadot transaction using Subscan API (Westend Testnet)
     */
    async validatePolkadotTransaction(txHash, expectedTo, minAmount, maxAmount) {
        const apiKey = process.env.SUBSCAN_API_KEY;
        if (!apiKey) {
            throw new Error('Subscan API key not configured');
        }
        // Using Polkadot Westend testnet
        const url = 'https://westend.api.subscan.io/api/scan/extrinsic';
        try {
            const response = await axios_1.default.post(url, {
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
                            const params = JSON.parse(event.params);
                            const toParam = params.find((p) => p.name === 'to' || p.type === 'AccountId');
                            const valueParam = params.find((p) => p.name === 'value' || p.type === 'Balance');
                            if (toParam && valueParam && toParam.value === expectedTo) {
                                totalAmount += parseFloat(valueParam.value) / 1e12; // Convert from Planck to WND (Westend)
                            }
                        }
                        catch (parseError) {
                            console.error('Error parsing Polkadot event params:', parseError);
                            continue;
                        }
                    }
                }
            }
            console.log(`   Polkadot Westend TX: ${totalAmount} WND to ${expectedTo}`);
            return totalAmount >= minAmount && totalAmount <= maxAmount;
        }
        catch (error) {
            console.error('Polkadot validation error:', error);
            return false;
        }
    }
    /**
     * Validate Starknet transaction using Starknet API (Goerli Testnet)
     */
    async validateStarknetTransaction(txHash, expectedTo, minAmount, maxAmount) {
        const rpcEndpoints = [
            'https://starknet-sepolia-rpc.publicnode.com',
            'https://starknet-sepolia.drpc.org',
            'https://rpc.starknet.lava.build'
        ];
        let lastError = '';
        for (const endpoint of rpcEndpoints) {
            try {
                console.log(`🔍 [STRK] Trying: ${endpoint.split('/')[2]}`);
                console.log(`   TX: ${txHash}`);
                console.log(`   Expected: ${minAmount}-${maxAmount} STRK to ${expectedTo}`);
                const response = await axios_1.default.post(endpoint, {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "starknet_getTransactionReceipt",
                    params: [txHash]
                }, {
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                const data = response.data;
                // Check for RPC errors
                if (data.error) {
                    lastError = `RPC error: ${data.error.message}`;
                    console.warn(`   ❌ ${lastError}`);
                    continue;
                }
                if (!data.result) {
                    lastError = 'No transaction result';
                    console.warn(`   ❌ ${lastError}`);
                    continue;
                }
                const receipt = data.result;
                console.log(`   ✅ Transaction found:`);
                console.log(`      - Status: ${receipt.finality_status || receipt.status}`);
                console.log(`      - Type: ${receipt.type}`);
                console.log(`      - Events: ${receipt.events?.length || 0}`);
                // Check transaction status
                if (receipt.finality_status !== 'ACCEPTED_ON_L2' && receipt.status !== 'ACCEPTED_ON_L2') {
                    console.error(`   ❌ Transaction not finalized: ${receipt.finality_status || receipt.status}`);
                    return false;
                }
                let totalAmount = 0;
                let foundTransfer = false;
                // Check transfer events
                if (receipt.events && receipt.events.length > 0) {
                    console.log(`   🔍 Analyzing ${receipt.events.length} events:`);
                    for (const event of receipt.events) {
                        console.log(`      Event keys: ${event.keys?.join(', ')}`);
                        console.log(`      Event data: ${event.data?.join(', ')}`);
                        // Look for transfer events (typically have 3 data elements: [from, to, amount])
                        if (event.data && event.data.length >= 3) {
                            const from = event.data[0];
                            const to = event.data[1];
                            const amount = event.data[2];
                            console.log(`      Transfer: ${from} -> ${to} = ${amount}`);
                            // Normalize addresses by removing leading zeros for comparison
                            const normalizedTo = to.replace(/^0x0+/, '0x');
                            const normalizedExpected = expectedTo.replace(/^0x0+/, '0x');
                            console.log(`      Normalized: ${normalizedTo} vs ${normalizedExpected}`);
                            if (normalizedTo === normalizedExpected) {
                                // Convert from wei (assuming 18 decimals for STRK)
                                const amountDecimal = parseInt(amount, 16) / 1e18;
                                totalAmount += amountDecimal;
                                foundTransfer = true;
                                console.log(`      ✅ VALID TRANSFER: ${amountDecimal} STRK to ${to}`);
                            }
                        }
                    }
                }
                if (foundTransfer) {
                    const isValid = totalAmount >= minAmount && totalAmount <= maxAmount;
                    console.log(`📊 [STRK] Summary: ${totalAmount} STRK to ${expectedTo}`);
                    console.log(`   - Expected range: ${minAmount}-${maxAmount} STRK`);
                    console.log(`   - Validation: ${isValid ? 'SUCCESS' : 'FAILED'}`);
                    return isValid;
                }
                else {
                    console.error(`   ❌ No STRK transfers found to ${expectedTo}`);
                    return false;
                }
            }
            catch (error) {
                lastError = error.message;
                if (error.response?.status === 403) {
                    console.warn(`   ❌ Endpoint blocked (403): ${endpoint.split('/')[2]}`);
                }
                else if (error.response?.status === 400) {
                    console.warn(`   ❌ Bad request (400): ${endpoint.split('/')[2]}`);
                }
                else if (error.code === 'ENOTFOUND') {
                    console.warn(`   ❌ DNS unreachable: ${endpoint.split('/')[2]}`);
                }
                else {
                    console.warn(`   ❌ Endpoint failed: ${error.message}`);
                }
                continue;
            }
        }
        console.error(`❌ [STRK] All RPC endpoints failed. Last error: ${lastError}`);
        return false;
    }
    /**
     * Validate USDT ERC-20 transaction using Etherscan (Goerli Testnet)
     */
    async validateUsdtTransaction(txHash, expectedTo, minAmount, maxAmount) {
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
            const response = await axios_1.default.get(url);
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
        }
        catch (error) {
            console.error('USDT validation error:', error);
            return false;
        }
    }
}
exports.BlockchainValidator = BlockchainValidator;
exports.blockchainValidator = new BlockchainValidator();
//# sourceMappingURL=index.js.map