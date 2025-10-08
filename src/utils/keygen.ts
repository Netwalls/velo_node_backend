// Generate and deploy a real ArgentX account (Starknet)

import { Wallet as EthWallet } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Keypair as SolKeypair } from '@solana/web3.js';
// import {
//     Account,
//     ec,
//     RpcProvider,
//     hash,
//     CallData,
//     CairoOption,
//     CairoOptionVariant,
//     CairoCustomEnum,
//     uint256,
//     constants,
// } from 'starknet';
import { Account, ec, stark, RpcProvider, hash, CallData } from 'starknet';

import crypto from 'crypto';
import { utils } from 'elliptic';

const ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY?.padEnd(32, '0').slice(0, 32) ||
    'velo_default_32_byte_key_123456789012'; // 32 bytes
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY),
        iv
    );
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
export function decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY),
        iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
    // End of fil
}

export function generateEthWallet() {
    const wallet = EthWallet.createRandom();
    return {
        mainnet: { address: wallet.address, privateKey: wallet.privateKey },
        testnet: { address: wallet.address, privateKey: wallet.privateKey }, // Same address for both networks
    };
}

export function generateBtcWallet() {
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.makeRandom();

    // Mainnet (P2PKH)
    const mainnetAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network: bitcoin.networks.bitcoin,
    });

    // Testnet (P2PKH)
    const testnetAddress = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network: bitcoin.networks.testnet,
    });

    return {
        mainnet: {
            address: mainnetAddress.address!,
            privateKey: keyPair.toWIF(),
        },
        testnet: {
            address: testnetAddress.address!,
            privateKey: keyPair.privateKey
                ? Buffer.from(keyPair.privateKey).toString('hex')
                : '',
        },
    };
}

export function generateSolWallet() {
    const keypair = SolKeypair.generate();
    const address = keypair.publicKey.toBase58();
    const privateKey = Buffer.from(keypair.secretKey).toString('hex');

    return {
        mainnet: { address, privateKey }, // Solana uses same address for mainnet
        testnet: { address, privateKey }, // and devnet/testnet
    };
}

// Generate a real Starknet account contract address (OpenZeppelin, ArgentX, Ethereum)
// export function generateStrkWallet(
//     accountType: 'openzeppelin' | 'argentx' | 'ethereum' = 'openzeppelin'
// ) {
//     const { ec, hash, CallData } = require('starknet');
//     // Account class hashes (update as needed)
//     const classHashes: Record<'openzeppelin' | 'argentx' | 'ethereum', string> =
//         {
//             openzeppelin:
//                 '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688',
//             argentx:
//                 '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f',
//             ethereum:
//                 '0x3940bc18abf1df6bc540cabadb1cad9486c6803b95801e57b6153ae21abfe06',
//         };
//     // Generate a real private key (hex string, 0x-prefixed)
//     const privateKey = ec.starkCurve.utils.randomPrivateKey();
//     const publicKey = ec.starkCurve.getStarkKey(privateKey);
//     const classHash = classHashes[accountType] || classHashes.openzeppelin;
//     const constructorCalldata = CallData.compile({ publicKey });
//     const salt = publicKey;
//     const address = hash.calculateContractAddressFromHash(
//         salt,
//         classHash,
//         constructorCalldata,
//         0 // deployer address
//     );
//     return {
//         mainnet: {
//             address,
//             privateKey,
//             publicKey,
//             classHash,
//             accountType,
//         },
//         testnet: {
//             address,
//             privateKey,
//             publicKey,
//             classHash,
//             accountType,
//         },
//     };
// }

interface NetworkWalletInfo {
    address: string;
    privateKey: string;
    publicKey: string;
    classHash: string;
    accountType: string;
}

interface GeneratedWallet {
    mainnet: NetworkWalletInfo;
    testnet: NetworkWalletInfo;
}

/**
 * Generate Starknet wallet for both mainnet and testnet
 */
export function generateStrkWallet(customPrivateKey?: string): GeneratedWallet {
    const privateKey = customPrivateKey || stark.randomAddress();
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    const classHash =
        '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688';

    const constructorCallData = CallData.compile({ publicKey });
    const address = hash.calculateContractAddressFromHash(
        publicKey,
        classHash,
        constructorCallData,
        0
    );

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
export async function checkBalance(
    provider: RpcProvider,
    address: string,
    minBalance: bigint = BigInt('1000000000000000')
): Promise<{ balance: bigint; hasSufficientFunds: boolean }> {
    const strkTokenAddress =
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

    const result = await provider.callContract({
        contractAddress: strkTokenAddress,
        entrypoint: 'balanceOf',
        calldata: [address],
    });
console.log("amount",result);
    const balanceInWei = BigInt(result[0]);
    return {
        balance: balanceInWei,
        hasSufficientFunds: balanceInWei >= minBalance,
    };
}

/**
 * Deploy Starknet wallet
 */
export async function deployStrkWallet(
    provider: RpcProvider,
    privateKey: string,
    publicKey: string,
    address: string,
    checkBalanceFirst: boolean = true
): Promise<Account> {
    // Check if already deployed
    try {
        await provider.getClassHashAt(address);
        console.log('Account already deployed');
        return new Account(provider, address, privateKey);
    } catch {}

    // Check balance if required
    if (checkBalanceFirst) {
        const { hasSufficientFunds } = await checkBalance(provider, address);
        if (!hasSufficientFunds) {
            throw new Error('Insufficient funds for deployment');
        }
    }

    const classHash =
        '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688';
    const constructorCallData = CallData.compile({ publicKey });
    const account = new Account(provider, address, privateKey);

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
