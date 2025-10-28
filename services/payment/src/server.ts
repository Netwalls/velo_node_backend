import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'payment' }));

app.get('/api/payment/ping', (_req, res) => res.json({ pong: true }));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Payment service listening on ${port}`);
});
