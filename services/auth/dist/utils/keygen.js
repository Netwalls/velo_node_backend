"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = exports.generatePolkadotWallet = exports.generateStellarWallet = exports.generateStrkWallet = exports.generateSolWallet = exports.generateBtcWallet = exports.generateEthWallet = void 0;
const crypto_1 = __importDefault(require("crypto"));
const makeAddress = (prefix) => ({
    mainnet: { address: `${prefix}_` + crypto_1.default.randomBytes(10).toString('hex'), privateKey: crypto_1.default.randomBytes(32).toString('hex') },
    testnet: { address: `${prefix}_` + crypto_1.default.randomBytes(10).toString('hex'), privateKey: crypto_1.default.randomBytes(32).toString('hex') },
});
const generateEthWallet = () => makeAddress('eth');
exports.generateEthWallet = generateEthWallet;
const generateBtcWallet = () => makeAddress('btc');
exports.generateBtcWallet = generateBtcWallet;
const generateSolWallet = () => makeAddress('sol');
exports.generateSolWallet = generateSolWallet;
const generateStrkWallet = () => makeAddress('strk');
exports.generateStrkWallet = generateStrkWallet;
const generateStellarWallet = () => makeAddress('xlm');
exports.generateStellarWallet = generateStellarWallet;
const generatePolkadotWallet = async () => makeAddress('dot');
exports.generatePolkadotWallet = generatePolkadotWallet;
const encrypt = (key) => {
    // lightweight placeholder encryption for the scaffold - replace with real encryption in prod
    return Buffer.from(key).toString('base64');
};
exports.encrypt = encrypt;
