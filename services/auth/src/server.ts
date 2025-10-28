import 'reflect-metadata';
import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRouter from './routes/authRoute';

dotenv.config();
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'auth' }));

app.use('/api/auth', authRouter);

const port = process.env.PORT || 3002;

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Auth service listening on ${port}`);
  });
}).catch((err) => {
  console.error('Failed to start auth service:', err);
  process.exit(1);
});
