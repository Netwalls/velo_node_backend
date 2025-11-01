"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const changellyRoute_1 = __importDefault(require("./changellyRoute"));
const router = (0, express_1.Router)();
// Mount Changelly endpoints under /fiat/changelly
router.use('/changelly', changellyRoute_1.default);
// router.post('/deposit/initiate', FiatController.initiateDeposit);
// router.post('/deposit/webhook', FiatController.paystackWebhook);
exports.default = router;
//# sourceMappingURL=fiatRoute.js.map