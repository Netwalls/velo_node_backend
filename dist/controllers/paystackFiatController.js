"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const FiatTransaction_1 = require("../entities/FiatTransaction");
const config_1 = require("../services/paystack/config");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const paystackService_1 = __importDefault(require("../services/paystack/paystackService"));
const nanoid_1 = require("nanoid");
const feeService_1 = __importDefault(require("../services/paystack/feeService"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class PaystackController {
    constructor() {
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
        this.transactionRepository = database_1.AppDataSource.getRepository(FiatTransaction_1.FiatTransaction);
        this.fundWallet = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    return res
                        .status(401)
                        .json({ message: "Unauthorized" });
                }
                const user = await this.userRepository.findOne({
                    where: { id: userId },
                });
                if (!user) {
                    return res
                        .status(404)
                        .json({ message: "User not found" });
                }
                const { amount, paymentDescription, crypto } = req.body;
                if (!amount ||
                    typeof amount !== "number" ||
                    isNaN(amount)) {
                    return res
                        .status(400)
                        .json({ error: "Valid amount is required" });
                }
                if (amount < 1000) {
                    return res.status(400).json({
                        error: "Amount to be funded must be greater than 1000NGN",
                    });
                }
                if (!crypto || typeof crypto !== "string") {
                    return res.status(400).json({
                        error: "Valid crypto currency is required",
                    });
                }
                // Generate unique reference
                const paymentRef = `VELO_REF_${Date.now()}_${(0, nanoid_1.nanoid)(8)}`;
                const fees = (0, feeService_1.default)(Number(amount));
                // Validate crypto currency
                if (!crypto || typeof crypto !== "string") {
                    return res.status(400).json({
                        error: "Valid crypto currency is required",
                    });
                }
                // build the response for the transaction
                const response = await (0, paystackService_1.default)({
                    amount: fees.totalToCharge,
                    customerEmail: user.email,
                    crypto: crypto,
                    paymentReference: paymentRef,
                    paymentDescription: paymentDescription,
                    redirectUrl: `${process.env.FRONTEND_DOMAIN}`,
                });
                // Save transaction in DB
                const transaction = this.transactionRepository.create({
                    userId: user.id,
                    amount: fees.userAmount,
                    reference: paymentRef,
                    crypto,
                    status: "pending",
                    paymentDescription,
                });
                await this.transactionRepository.save(transaction);
                // Return response for frontend
                return res.status(200).json({
                    message: "Transaction initialized. Please complete payment.",
                    checkoutUrl: response.data.authorization_url,
                    reference: paymentRef,
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fund wallet" });
            }
        };
        this.verifyTransactionWithWebhook = async (req, res) => {
            try {
                const signature = req.headers["x-paystack-signature"];
                const payload = JSON.stringify(req.body);
                if (!config_1.paystackConfig.secretKey) {
                    throw new Error("PAYSTACK_SECRET_KEY is not set in environment");
                }
                const expectedSignature = crypto_1.default
                    .createHmac("sha512", config_1.paystackConfig.secretKey)
                    .update(payload)
                    .digest("hex");
                if (signature !== expectedSignature) {
                    return res.status(430).json({
                        success: false,
                        error: "Invalid signature",
                    });
                }
                const { event, data } = req.body;
                if (event !== "charge.success") {
                    return res.status(200).json({
                        message: "Paystack Webhook acknowledged: Skipped processing",
                    });
                }
                const reference = data.reference;
                const amountPaid = data.amount / 100; // convert kobo → Naira
                const transaction = await this.transactionRepository.findOne({
                    where: { reference },
                });
                if (!transaction) {
                    return res.status(404).json({
                        success: false,
                        error: "Transaction not found",
                    });
                }
                if (transaction.status === "success") {
                    return res.status(200).json({
                        message: "Transaction has been processed earlier",
                    });
                }
                // Mark transaction as successful
                transaction.status = "success";
                await this.transactionRepository.save(transaction);
                return res.status(200).json({
                    success: true,
                    message: "Transaction verified successfully",
                    reference,
                    amountPaid,
                });
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    error: "Internal server error",
                });
            }
        };
    }
}
exports.PaystackController = PaystackController;
//# sourceMappingURL=paystackFiatController.js.map