import express from 'express';
import { airtimeController } from '../controllers/airtimeController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/purchase', verifyToken, (req, res) => airtimeController.processAirtimePurchase(req, res));
router.get('/expected-amount', (req, res) => airtimeController.getExpectedAmount(req, res));
router.get('/history', verifyToken, (req, res) => airtimeController.getUserAirtimeHistory(req, res));
router.get('/options', (req, res) => airtimeController.getSupportedOptions(req, res));
router.get('/purchase/:purchaseId', verifyToken, (req, res) => airtimeController.getAirtimePurchase(req, res));

export default router;
