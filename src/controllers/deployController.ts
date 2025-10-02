import { RpcProvider } from 'starknet';

export async function isStarknetAccountDeployed(address: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<boolean> {
    const nodeUrl =
        network === 'mainnet'
            ? 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/CP1fRkzqgL_nwb9DNNiKI'
            : 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/CP1fRkzqgL_nwb9DNNiKI';

    const provider = new RpcProvider({ nodeUrl });

    try {
        await provider.getClassHashAt(address);
        return true;
    } catch {
        return false;
    }
}