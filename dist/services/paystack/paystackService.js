"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const initializeTransaction = async (data) => {
    if (!data)
        throw new Error('Customer info is required');
    try {
        const response = await axios_1.default.post(`${config_1.paystackConfig.baseUrl}/transaction/initialize`, {
            email: data.customerEmail,
            amount: data.amount * 100,
            reference: data.paymentReference,
            callback_url: data.redirectUrl,
            metadata: {
                description: data.paymentDescription,
                custom_fields: [],
            },
        }, {
            headers: {
                Authorization: `Bearer ${config_1.paystackConfig.secretKey}`,
            },
        });
        return response.data;
    }
    catch (error) {
        throw new Error(error?.response?.data?.message || 'Failed to initialize transaction');
    }
};
exports.default = initializeTransaction;
//# sourceMappingURL=paystackService.js.map