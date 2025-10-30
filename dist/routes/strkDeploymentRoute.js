"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StrkDeploymentController_1 = require("../controllers/StrkDeploymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/balances/testnet/deploy', auth_1.authMiddleware, StrkDeploymentController_1.StrkController.getTestnetBalancesDeploy);
// Get mainnet balances for the authenticated user
router.get('/balances/mainnet/deploy', auth_1.authMiddleware, StrkDeploymentController_1.StrkController.getMainnetBalancesDeploy);
exports.default = router;
//# sourceMappingURL=strkDeploymentRoute.js.map