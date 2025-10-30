"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStarknetAccountDeployed = isStarknetAccountDeployed;
const starknet_1 = require("starknet");
async function isStarknetAccountDeployed(address, network = 'testnet') {
    const nodeUrl = network === 'mainnet'
        ? `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`
        : `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`;
    const provider = new starknet_1.RpcProvider({ nodeUrl });
    try {
        await provider.getClassHashAt(address);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=deployController.js.map