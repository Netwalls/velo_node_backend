"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const express_1 = require("express");
const airtime_1 = __importDefault(require("./airtime"));
const data_1 = __importDefault(require("./data"));
const electricity_1 = __importDefault(require("./electricity"));
const router = (0, express_1.Router)();
router.use("/airtime", airtime_1.default);
router.use("/data", data_1.default);
router.use("/electricity", electricity_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map