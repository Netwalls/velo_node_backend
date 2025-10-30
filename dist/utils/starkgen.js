"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStrkWallet = generateStrkWallet;
exports.checkBalance = checkBalance;
exports.deployStrkWallet = deployStrkWallet;
const starknet_1 = require("starknet");
/**
 * Generate Starknet wallet for both mainnet and testnet
 */
function generateStrkWallet(customPrivateKey) {
    const privateKey = customPrivateKey || starknet_1.stark.randomAddress();
    const publicKey = starknet_1.ec.starkCurve.getStarkKey(privateKey);
    const classHash = '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688';
    const constructorCallData = starknet_1.CallData.compile({ publicKey });
    const address = starknet_1.hash.calculateContractAddressFromHash(publicKey, classHash, constructorCallData, 0);
    return {
        mainnet: {
            address,
            privateKey,
            publicKey,
            classHash,
            accountType: 'OpenZeppelin',
        },
        testnet: {
            address,
            privateKey,
            publicKey,
            classHash,
            accountType: 'OpenZeppelin',
        },
    };
}
/**
 * Check if address has sufficient balance
 */
async function checkBalance(provider, address, minBalance = BigInt('1000000000000000')) {
    const strkTokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
    const result = await provider.callContract({
        contractAddress: strkTokenAddress,
        entrypoint: 'balanceOf',
        calldata: [address]
    });
    const balanceInWei = BigInt(result[0]);
    return {
        balance: balanceInWei,
        hasSufficientFunds: balanceInWei >= minBalance
    };
}
/**
 * Deploy Starknet wallet
 */
async function deployStrkWallet(provider, privateKey, publicKey, address, checkBalanceFirst = true) {
    // Check if already deployed
    try {
        await provider.getClassHashAt(address);
        console.log('Account already deployed');
        return new starknet_1.Account(provider, address, privateKey);
    }
    catch { }
    // Check balance if required
    if (checkBalanceFirst) {
        const { hasSufficientFunds } = await checkBalance(provider, address);
        if (!hasSufficientFunds) {
            throw new Error('Insufficient funds for deployment');
        }
    }
    const classHash = '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688';
    const constructorCallData = starknet_1.CallData.compile({ publicKey });
    const account = new starknet_1.Account(provider, address, privateKey);
    const { transaction_hash, contract_address } = await account.deployAccount({
        classHash,
        constructorCalldata: constructorCallData,
        addressSalt: publicKey,
    });
    await provider.waitForTransaction(transaction_hash);
    console.log('Account deployed:', contract_address);
    return account;
}
// Example usage:
/*
import { RpcProvider } from 'starknet';

// 1. Generate wallet
const wallet = generateStrkWallet();
console.log('Mainnet address:', wallet.mainnet.address);
console.log('Testnet address:', wallet.testnet.address);

// 2. Check balance (for testnet)
const provider = new RpcProvider({
  nodeUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7'
});
const { hasSufficientFunds } = await checkBalance(provider, wallet.testnet.address);

// 3. Deploy if funded
if (hasSufficientFunds) {
  const account = await deployStrkWallet(
    provider,
    wallet.testnet.privateKey,
    wallet.testnet.publicKey,
    wallet.testnet.address
  );
  console.log('Deployed!');
}

// For mainnet, use:
// const mainnetProvider = new RpcProvider({
//   nodeUrl: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7'
// });
*/ 
//# sourceMappingURL=starkgen.js.map