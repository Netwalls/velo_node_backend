// Generate and deploy a real ArgentX account (Starknet)


import { Wallet as EthWallet } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Keypair as SolKeypair } from '@solana/web3.js';
import {
  Account,
  ec,
  json,
  stark,
  RpcProvider,
  hash,
  CallData,
  CairoOption,
  CairoOptionVariant,
  CairoCustomEnum,
} from 'starknet';
import crypto from 'crypto';

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
export function generateStrkWallet(
    accountType: 'openzeppelin' | 'argentx' | 'ethereum' = 'openzeppelin'
) {
    const { ec, hash, CallData } = require('starknet');
    // Account class hashes (update as needed)
    const classHashes: Record<'openzeppelin' | 'argentx' | 'ethereum', string> =
        {
            openzeppelin:
                '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688',
            argentx:
                '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f',
            ethereum:
                '0x3940bc18abf1df6bc540cabadb1cad9486c6803b95801e57b6153ae21abfe06',
        };
    // Generate a real private key (hex string, 0x-prefixed)
    const privateKey = ec.starkCurve.utils.randomPrivateKey();
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    const classHash = classHashes[accountType] || classHashes.openzeppelin;
    const constructorCalldata = CallData.compile({ publicKey });
    const salt = publicKey;
    const address = hash.calculateContractAddressFromHash(
        salt,
        classHash,
        constructorCalldata,
        0 // deployer address
    );
    return {
        mainnet: {
            address,
            privateKey,
            publicKey,
            classHash,
            accountType,
        },
        testnet: {
            address,
            privateKey,
            publicKey,
            classHash,
            accountType,
        },
    };
}

/**
 * Generates and deploys a real ArgentX account on Starknet.
 * @param nodeUrl The Starknet node URL (e.g., https://starknet-mainnet.infura.io/v3/...) 
 * @returns Object with privateKey, publicKey, precalculated address, and deployed address
 */
export async function generateAndDeployArgentXAccount() {
  const nodeUrl= "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI"
    // 1. Provider
    const provider = new RpcProvider({ nodeUrl });

    // 2. ArgentX class hash (v0.4.0)
    const argentXaccountClassHash =
        '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f';

    // 3. Generate private/public key
    const privateKeyAX = stark.randomAddress();
    console.log('AX_ACCOUNT_PRIVATE_KEY=', privateKeyAX);
    const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);
console.log('AX_ACCOUNT_PUBLIC_KEY=', starkKeyPubAX);
    // const privateKey = ec.starkCurve.utils.randomPrivateKey();
    // const publicKey = ec.starkCurve.getStarkKey(privateKey);

    // 4. Prepare constructor calldata (ArgentX expects Cairo enums)
    // If you have the CairoCustomEnum and CairoOption types, use them. Otherwise, use plain publicKey for owner and 0 for guardian.
    // For most backend use-cases, this is sufficient:
    const AXConstructorCallData = CallData.compile({
        owner: starkKeyPubAX,
        guardian: '0',
    });

    // 5. Precompute address
    const AXcontractAddress = hash.calculateContractAddressFromHash(
  starkKeyPubAX,
  argentXaccountClassHash,
  AXConstructorCallData,
  0
    );
    // 6. Create Account instance (not yet deployed)
const accountAX = new Account(provider, AXcontractAddress, privateKeyAX);

    // 7. Prepare deploy payload
const deployAccountPayload = {
  classHash: argentXaccountClassHash,
  constructorCalldata: AXConstructorCallData,
  contractAddress: AXcontractAddress,
  addressSalt: starkKeyPubAX,
};
    // 8. Deploy account (requires fee/funded deployer)
    // const { transaction_hash, contract_address } = await accountAX.deployAccount(deployAccountPayload);
const { transaction_hash: AXdAth, contract_address: AXcontractFinalAddress } =
  await accountAX.deployAccount(deployAccountPayload);
console.log('✅ ArgentX wallet deployed at:', AXcontractFinalAddress);


    return {
        privateKeyAX,
        starkKeyPubAX,
        AXcontractAddress,
        deployedAddress: AXcontractFinalAddress,
        deployTxHash: AXdAth,
    };
}

