import { Router } from 'express';

const router = Router();

router.post('/paj-ramp', (req, res) => {
  const payload = req.body;
  console.log('Webhook PAJ Ramp:', payload);

  const { id, status, transactionType } = payload;
  console.log(`Order ${id} → ${status} (${transactionType})`);

  // TODO: update your DB, notify user, etc.

  res.json({ received: true });
});

export default router;