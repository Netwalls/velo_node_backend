import { Router } from "express";
import { PaystackController } from "../controllers/paystackFiatController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const paystackController = new PaystackController();

router.post("/fund-wallet", authMiddleware, paystackController.fundWallet);
router.post("/verify-payment", paystackController.verifyTransactionWithWebhook);

export default router;
