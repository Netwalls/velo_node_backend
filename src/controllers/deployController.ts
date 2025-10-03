import { RpcProvider } from 'starknet';

export async function isStarknetAccountDeployed(address: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<boolean> {
    const nodeUrl =
        network === 'mainnet'
            ? `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/${process.env.ALCHEMY_STARKNET_KEY}`
            : `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${process.env.ALCHEMY_STARKNET_KEY}`;

    const provider = new RpcProvider({ nodeUrl });

    try {
        await provider.getClassHashAt(address);
        return true;
    } catch {
        return false;
    }
}