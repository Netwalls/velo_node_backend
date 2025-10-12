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
    'velo_default_32_byte_key_123456789012'; // fallback string
const ALGORITHM = 'aes-256-cbc';

// Derive a fixed 32-byte key from the ENCRYPTION_KEY using SHA-256.
// This guarantees a valid 32-byte Buffer for AES-256 regardless of the
// environment variable length or characters.
const KEY_BUFFER = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
export function decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
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

export function generateStellarWallet() {
    // Always generate a valid Stellar ed25519 keypair.
    // Prefer `stellar-sdk` Keypair if available (returns StrKey encoded values).
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Keypair: StellarKeypair } = require('stellar-sdk');
        const pair = StellarKeypair.random();
        return {
            mainnet: { address: pair.publicKey(), privateKey: pair.secret() },
            testnet: { address: pair.publicKey(), privateKey: pair.secret() },
        };
    } catch (err) {
        // Fallback: generate ed25519 keys and encode to Stellar StrKey format
        // without adding external deps. This implements the minimal StrKey
        // encoder (version byte + payload + CRC16-XModem) + base32.

        // Generate ed25519 keypair using Node's crypto (available in modern Node versions)
        // If crypto.generateKeyPairSync isn't available for ed25519, fall back to
        // using a simple deterministic approach (not ideal) — but most envs have it.
        try {
            // Create ed25519 keypair
            // Node's CSR/KeyObject API returns PEM/DER; we'll use raw keys via generateKeyPairSync
            // which supports 'ed25519' and returns Buffer for private/public when format='der' + type
            // However Node's support for `privateKey.export({ format: 'der', type: 'pkcs8' })` is stable.
            const { generateKeyPairSync } = require('crypto');
            const { publicKey, privateKey } = generateKeyPairSync('ed25519');

            // Export raw public/private key bytes (SubjectPublicKeyInfo / PKCS8 -> extract raw)
            // Node 12+ supports export with format 'der' and 'spki'/'pkcs8' types.
            const pubDer = publicKey.export({ type: 'spki', format: 'der' });
            const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });

            // Extract raw bytes from DER structures by slicing standard headers.
            // For ed25519 spki, the public key raw bytes are the last 32 bytes.
            const pubRaw = pubDer.slice(-32);
            // For pkcs8, the private key raw seed is typically the last 34 bytes where the last 32 are the seed
            const privRaw = privDer.slice(-32);

            const publicKeyBytes: Buffer = Buffer.from(pubRaw);
            const privateKeyBytes: Buffer = Buffer.from(privRaw);

            // StrKey (Stellar) encoding helpers
            const base32 = (buf: Buffer) => {
                // RFC4648 base32 (no padding) using built-in Buffer -> base64 isn't suitable
                const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                let bits = 0;
                let value = 0;
                let output = '';
                for (let i = 0; i < buf.length; i++) {
                    value = (value << 8) | buf[i];
                    bits += 8;
                    while (bits >= 5) {
                        output += ALPHABET[(value >>> (bits - 5)) & 31];
                        bits -= 5;
                    }
                }
                if (bits > 0) {
                    output += ALPHABET[(value << (5 - bits)) & 31];
                }
                return output;
            };

            const crc16xmodem = (data: Buffer) => {
                let crc = 0x0000;
                for (let offset = 0; offset < data.length; offset++) {
                    crc ^= (data[offset] & 0xff) << 8;
                    for (let bit = 0; bit < 8; bit++) {
                        if ((crc & 0x8000) !== 0) {
                            crc = (crc << 1) ^ 0x1021;
                        } else {
                            crc <<= 1;
                        }
                        crc &= 0xffff;
                    }
                }
                return crc;
            };

            const encodeStrKey = (versionByte: number, payload: Buffer) => {
                const versionBuf = Buffer.from([versionByte]);
                const data = Buffer.concat([versionBuf, payload]);
                const crc = crc16xmodem(data);
                const crcBuf = Buffer.alloc(2);
                crcBuf.writeUInt16LE(crc, 0);
                const toEncode = Buffer.concat([data, crcBuf]);
                return base32(toEncode);
            };

            // Stellar version bytes: 6 << 3 = 48 for account ID (public key), 18 << 3 = 144 for seed
            const VERSION_BYTE_ACCOUNT_ID = 6 << 3; // G...
            const VERSION_BYTE_SEED = 18 << 3; // S...

            const publicStr = encodeStrKey(VERSION_BYTE_ACCOUNT_ID, publicKeyBytes);
            const privateStr = encodeStrKey(VERSION_BYTE_SEED, privateKeyBytes);

            // Pad with 'G'/'S' prefixes by reconstructing full StrKey: base32 output needs to be
            // converted to canonical representation. The minimal implementation above yields correct
            // base32 characters but Stellar's StrKey uses RFC4648 with padding removed and prefixes
            // 'G' for account and 'S' for seed are implicit in version byte. To match expectation
            // for readability, prefix the result with nothing because version byte already encodes.

            return {
                mainnet: { address: publicStr, privateKey: privateStr },
                testnet: { address: publicStr, privateKey: privateStr },
            };
        } catch (err2) {
            console.warn('Failed to generate Stellar keys in fallback:', err2);
            return {
                mainnet: { address: '', privateKey: '' },
                testnet: { address: '', privateKey: '' },
            };
        }
    }
}

export async function generatePolkadotWallet() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const polka = require('@polkadot/util-crypto');
        // ensure WASM crypto initialized
        if (polka.cryptoWaitReady) {
            await polka.cryptoWaitReady();
        }
        const mnemonic = polka.mnemonicGenerate ? polka.mnemonicGenerate() : '';
        const seed = polka.mnemonicToMiniSecret
            ? polka.mnemonicToMiniSecret(mnemonic)
            : Buffer.from([]);
        const address = polka.encodeAddress ? polka.encodeAddress(seed, 42) : '';
        return {
            mainnet: { address, privateKey: Buffer.from(seed).toString('hex') },
            testnet: { address, privateKey: Buffer.from(seed).toString('hex') },
            mnemonic,
        };
    } catch (err) {
        console.warn('Polkadot util-crypto not installed, skipping polkadot wallet generation');
        return {
            mainnet: { address: '', privateKey: '' },
            testnet: { address: '', privateKey: '' },
            mnemonic: '',
        };
    }
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
