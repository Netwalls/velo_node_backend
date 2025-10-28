// Re-export the monolith keygen implementation so the auth microservice
// uses a single source of truth for wallet generation and encryption.
// At runtime require the monolith keygen implementation and re-export the
// functions here. We avoid a static `export * from` so TypeScript's compiler
// won't attempt to include the monolith `src` tree under the service's
// `rootDir` (which would cause a rootDir error).
const remoteKeygen: any = require('../../../../src/utils/keygen');

export default remoteKeygen;

export const encrypt = remoteKeygen.encrypt;
export const decrypt = remoteKeygen.decrypt;
export const generateEthWallet = remoteKeygen.generateEthWallet;
export const generateBtcWallet = remoteKeygen.generateBtcWallet;
export const generateSolWallet = remoteKeygen.generateSolWallet;
export const generateStellarWallet = remoteKeygen.generateStellarWallet;
export const generatePolkadotWallet = remoteKeygen.generatePolkadotWallet;
export const recoverPolkadotWallet = remoteKeygen.recoverPolkadotWallet;
export const validatePaseoAddress = remoteKeygen.validatePaseoAddress;
export const generateStrkWallet = remoteKeygen.generateStrkWallet;
export const checkBalance = remoteKeygen.checkBalance;
export const deployStrkWallet = remoteKeygen.deployStrkWallet;
