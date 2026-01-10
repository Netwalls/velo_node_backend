import express from 'express';
import { performRhinoSwap } from '../controllers/rhino_controller';

const router = express.Router();

router.post('/swap', async (req, res) => {
  try {
    const {
      fromToken,    // e.g., "USDC"
      toToken,      // e.g., "USDT" – can be same or different
      amount,
      chainIn,
      chainOut,
      depositor,
      recipient,
      privateKey,   // Handle with extreme care (better: client-side signing in prod)
    } = req.body;

    if (!fromToken || !toToken || !amount || !depositor || !recipient || !privateKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await performRhinoSwap({
      fromToken,
      toToken,
      amount,
      chainIn,
      chainOut,
      depositor,
      recipient,
      privateKey,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Rhino swap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;