"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const swapController_1 = require("../controllers/swapController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get swap quote (can be public, but we keep auth to align with user context)
router.post('/quote', auth_1.authMiddleware, swapController_1.SwapController.getQuote);
router.post('/quote/simple', auth_1.authMiddleware, swapController_1.SwapController.getQuoteSimple);
// Execute swap (requires auth)
router.post('/execute', auth_1.authMiddleware, swapController_1.SwapController.execute);
router.post('/execute/simple', auth_1.authMiddleware, swapController_1.SwapController.executeSimple);
// Cross-chain swap endpoints
router.post('/cross-chain/quote', auth_1.authMiddleware, swapController_1.SwapController.getCrossChainQuote);
router.post('/cross-chain/execute', auth_1.authMiddleware, swapController_1.SwapController.executeCrossChainSwap);
router.get('/cross-chain/status/:transactionId', auth_1.authMiddleware, swapController_1.SwapController.getCrossChainStatus);
router.get('/supported-chains', swapController_1.SwapController.getSupportedChains);
exports.default = router;
//# sourceMappingURL=swapRoute.js.map