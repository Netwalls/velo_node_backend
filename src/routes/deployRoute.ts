import express from 'express';
import { isStarknetAccountDeployed } from '../controllers/deployController';

const router = express.Router();

router.get('/starknet/is-deployed', async (req, res) => {
    const { address, network } = req.query;
    if (!address) {
        return res.status(400).json({ error: 'address is required' });
    }
    const isDeployed = await isStarknetAccountDeployed(
        address as string,
        (network as 'mainnet' | 'testnet') || 'testnet'
    );
    res.json({ address, network: network || 'testnet', isDeployed });
});

export default router;