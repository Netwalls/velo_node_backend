// Generate and deploy a real ArgentX account (Starknet)

import { Wallet as EthWallet } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Keypair as SolKeypair } from '@solana/web3.js';
import {
    Account,
    ec,
    RpcProvider,
    hash,
    CallData,
    CairoOption,
    CairoOptionVariant,
    CairoCustomEnum,
    uint256,
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
const faucetAccountAddress =
    '0x0bbc850380670ae92b3a24a9ca533a20c03ced12b765b58ab6a2de4c6e04f52';
const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY as string;
const ethTokenAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'; // <-- Replace with actual ETH contract address

async function fundStarknetAccount(
    provider: RpcProvider,
    recipient: string,
    amountEth: string
) {
    const faucetAccount = new Account(
        provider,
        faucetAccountAddress,
        faucetPrivateKey
    );
    const amountWei = BigInt(Number(amountEth) * 1e18).toString();
    const amountUint256 = uint256.bnToUint256(amountWei);

    const tx = await faucetAccount.execute({
        contractAddress: ethTokenAddress,
        entrypoint: 'transfer',
        calldata: [recipient, amountUint256.low, amountUint256.high],
    });
    return tx;
}

async function waitForFunding(
    provider: RpcProvider,
    address: string,
    minEth = 0.001,
    timeoutMs = 120_000
) {
    const minWei = BigInt(Math.floor(minEth * 1e18));
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const result = await provider.callContract({
                contractAddress: ethTokenAddress,
                entrypoint: 'balanceOf',
                calldata: [address],
            });
            const balance = uint256.uint256ToBN({
                low: result[0],
                high: result[1],
            });
            if (balance >= minWei) return true;
        } catch (e) {}
        await new Promise((res) => setTimeout(res, 4000));
    }
    throw new Error('Funding did not arrive in time');
}

export async function generateAndDeployArgentXAccount(
    network: 'mainnet' | 'testnet' = 'testnet'
) {
    const nodeUrl =
        network === 'mainnet'
            ? `https://starknet-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`
            : `https://starknet-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
    const provider = new RpcProvider({ nodeUrl });

    const argentXaccountClassHash =
        '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f';

    // Generate a valid private key as hex string
    const privateKeyAX = ec.starkCurve.utils.randomPrivateKey();
    const privateKeyHex = '0x' + Buffer.from(privateKeyAX).toString('hex');
    const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyHex);

    // Use Cairo enums for constructor calldata
    const axSigner = new CairoCustomEnum({
        Starknet: { pubkey: starkKeyPubAX },
    });
    const axGuardian = new CairoOption(CairoOptionVariant.None);
    const AXConstructorCallData = CallData.compile({
        owner: axSigner,
        guardian: axGuardian,
    });

    const AXcontractAddress = hash.calculateContractAddressFromHash(
        starkKeyPubAX,
        argentXaccountClassHash,
        AXConstructorCallData,
        0
    );

    // 1. Fund the new account
    await fundStarknetAccount(provider, AXcontractAddress, '0.01'); // 0.01 ETH

    // 2. Wait for funding to arrive
    await waitForFunding(provider, AXcontractAddress, 0.001);

    // 3. Deploy the account
    const accountAX = new Account(provider, AXcontractAddress, privateKeyHex);
    const deployAccountPayload = {
        classHash: argentXaccountClassHash,
        constructorCalldata: AXConstructorCallData,
        contractAddress: AXcontractAddress,
        addressSalt: starkKeyPubAX,
    };

    const {
        transaction_hash: AXdAth,
        contract_address: AXcontractFinalAddress,
    } = await accountAX.deployAccount(deployAccountPayload);

    return {
        privateKey: privateKeyHex,
        publicKey: starkKeyPubAX,
        AXcontractAddress,
        deployedAddress: AXcontractFinalAddress,
        deployTxHash: AXdAth,
    };
}
