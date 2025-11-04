"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const changellyController_1 = require("../controllers/changellyController");
const router = (0, express_1.Router)();
// Public endpoints to proxy Changelly fiat API
router.get('/providers', changellyController_1.ChangellyController.getProviders);
router.get('/currencies', changellyController_1.ChangellyController.getCurrencies);
router.get('/available-countries', changellyController_1.ChangellyController.getAvailableCountries);
router.get('/offers', changellyController_1.ChangellyController.getOffers);
router.post('/orders', changellyController_1.ChangellyController.createOrder);
router.post('/validate-address', changellyController_1.ChangellyController.validateAddress);
// Simplified single-endpoint flows for frontend
// POST /fiat/changelly/crypto/deposit  -> create on-ramp order (NGN -> crypto)
router.post('/crypto/deposit', changellyController_1.ChangellyController.deposit);
// POST /fiat/changelly/crypto/withdraw -> create off-ramp order (crypto -> NGN)
router.post('/crypto/withdraw', changellyController_1.ChangellyController.withdraw);
// Off-ramp
router.get('/sell/offers', changellyController_1.ChangellyController.getSellOffers);
router.post('/sell/orders', changellyController_1.ChangellyController.createSellOrder);
// Orders listing
router.get('/orders', changellyController_1.ChangellyController.getOrders);
exports.default = router;
//# sourceMappingURL=changellyRoute.js.map