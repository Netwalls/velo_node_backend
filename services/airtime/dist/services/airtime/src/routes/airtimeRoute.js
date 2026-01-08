"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const airtimeController_1 = require("../controllers/airtimeController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/purchase', auth_1.verifyToken, (req, res) => airtimeController_1.airtimeController.processAirtimePurchase(req, res));
router.get('/expected-amount', (req, res) => airtimeController_1.airtimeController.getExpectedAmount(req, res));
router.get('/history', auth_1.verifyToken, (req, res) => airtimeController_1.airtimeController.getUserAirtimeHistory(req, res));
router.get('/options', (req, res) => airtimeController_1.airtimeController.getSupportedOptions(req, res));
router.get('/purchase/:purchaseId', auth_1.verifyToken, (req, res) => airtimeController_1.airtimeController.getAirtimePurchase(req, res));
exports.default = router;
