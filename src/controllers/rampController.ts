import { Request, Response } from 'express';
import { PajRampService } from '../services/pajRampService';

export class RampController {
  static async session(req: Request, res: Response) {
    const { email, otp } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const result = await PajRampService.createSession(email, otp);
    return result.success
      ? res.json(result.data)
      : res.status(400).json({ error: result.error });
  }

  static async onRamp(req: Request, res: Response) {
    const { token, walletAddress, fiatAmount, currency, mint, chain } = req.body;
    if (!token || !walletAddress)
      return res.status(400).json({ error: 'token & walletAddress required' });

    const result = await PajRampService.createOnRampOrder(token, walletAddress, fiatAmount, currency, mint, chain);
    return result.success
      ? res.json(result.data)
      : res.status(400).json({ error: result.error });
  }

  static async getBanks(req: Request, res: Response) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    const result = await PajRampService.getAvailableBanks(token);
    return result.success
      ? res.json(result.data)
      : res.status(400).json({ error: result.error });
  }

  static async offRamp(req: Request, res: Response) {
    const { token, bankId, accountNumber, amount, currency, mint } = req.body;
    if (!token || !bankId || !accountNumber)
      return res.status(400).json({ error: 'token, bankId & accountNumber required' });

    const result = await PajRampService.createOffRampOrder(token, bankId, accountNumber, amount, currency, mint);
    return result.success
      ? res.json(result.data)
      : res.status(400).json({ error: result.error });
  }

  static async rates(req: Request, res: Response) {
    const result = await PajRampService.getRates();
    return result.success
      ? res.json(result.data)
      : res.status(500).json({ error: result.error });
  }

  static async transactions(req: Request, res: Response) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    const result = await PajRampService.getTransactions(token);
    return result.success
      ? res.json(result.data)
      : res.status(400).json({ error: result.error });
  }
}