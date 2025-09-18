// import {
//     generateEthWallet,
//     generateBtcWallet,
//     generateSolWallet,
//     generateStrkWallet,
//     encrypt,
// } from '../utils/keygen';
// import { ChainType, NetworkType } from '../types';
// import { AppDataSource } from '../config/database';
// import { UserAddress } from '../entities/UserAddress';
// import { User } from '../entities/User';

// // Helper for Starknet deployment
// async function deployStarknetAccount(
//     strk: any,
//     network: NetworkType,
//     OZ_CLASS_HASH: string
// ) {
//     const { stark, hash, RpcProvider, Account, CallData } = require('starknet');
//     try {
//         const privateKey = strk[network].privateKey;
//         const publicKey = stark.getStarkKey(privateKey);
//         const constructorCalldata = CallData.compile({ publicKey });
//         const salt = publicKey;
//         const address = hash.calculateContractAddressFromHash(
//             salt,
//             OZ_CLASS_HASH,
//             constructorCalldata,
//             0
//         );
//         // Only return the precomputed address, do not deploy
//         return { address, privateKey, publicKey };
//     } catch (err) {
//         console.error(`[STRK ${network} Address Error]`, err);
//         return { address: '', privateKey: '', publicKey: '' };
//     }
// }

// export async function generateAndDeployAllWallets(user: User) {
//     const eth = generateEthWallet();
//     const btc = generateBtcWallet();
//     const sol = generateSolWallet();
//     const strk = generateStrkWallet();
//     const OZ_CLASS_HASH = {
//         mainnet:
//             '0x05b7b3e6e8e7e0e2e3e2e1e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0',
//         testnet:
//             '0x06b7b3e6e8e7e0e2e3e2e1e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0',
//     };
//     const strkMainnetDeployed = await deployStarknetAccount(
//         strk,
//         NetworkType.MAINNET,
//         OZ_CLASS_HASH.mainnet
//     );
//     const strkTestnetDeployed = await deployStarknetAccount(
//         strk,
//         NetworkType.TESTNET,
//         OZ_CLASS_HASH.testnet
//     );
//     return [
//         // Ethereum mainnet & testnet
//         {
//             chain: ChainType.ETHEREUM,
//             network: NetworkType.MAINNET,
//             address: eth.mainnet.address,
//             encryptedPrivateKey: encrypt(eth.mainnet.privateKey),
//         },
//         {
//             chain: ChainType.ETHEREUM,
//             network: NetworkType.TESTNET,
//             address: eth.testnet.address,
//             encryptedPrivateKey: encrypt(eth.testnet.privateKey),
//         },
//         // Bitcoin mainnet & testnet
//         {
//             chain: ChainType.BITCOIN,
//             network: NetworkType.MAINNET,
//             address: btc.mainnet.address,
//             encryptedPrivateKey: encrypt(btc.mainnet.privateKey),
//         },
//         {
//             chain: ChainType.BITCOIN,
//             network: NetworkType.TESTNET,
//             address: btc.testnet.address,
//             encryptedPrivateKey: encrypt(btc.testnet.privateKey),
//         },
//         // Solana mainnet & testnet
//         {
//             chain: ChainType.SOLANA,
//             network: NetworkType.MAINNET,
//             address: sol.mainnet.address,
//             encryptedPrivateKey: encrypt(sol.mainnet.privateKey),
//         },
//         {
//             chain: ChainType.SOLANA,
//             network: NetworkType.TESTNET,
//             address: sol.testnet.address,
//             encryptedPrivateKey: encrypt(sol.testnet.privateKey),
//         },
//         // Starknet mainnet & testnet
//         {
//             chain: ChainType.STARKNET,
//             network: NetworkType.MAINNET,
//             address: strkMainnetDeployed.address,
//             encryptedPrivateKey: encrypt(strkMainnetDeployed.privateKey),
//         },
//         {
//             chain: ChainType.STARKNET,
//             network: NetworkType.TESTNET,
//             address: strkTestnetDeployed.address,
//             encryptedPrivateKey: encrypt(strkTestnetDeployed.privateKey),
//         },
//     ];
// }
