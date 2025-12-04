"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiatService = void 0;
const fiat_api_sdk_node_1 = require("@changelly/fiat-api-sdk-node");
class FiatService {
    constructor() {
        this.client = new fiat_api_sdk_node_1.ChangellyFiatClient({
            privateKey: process.env.CHANGELLY_FIAT_PRIVATE_KEY || '',
            publicKey: process.env.CHANGELLY_FIAT_PUBLIC_KEY || '',
        });
    }
    getProvivers() {
        return this.client.getProviderList();
    }
}
exports.FiatService = FiatService;
//# sourceMappingURL=fiatService.js.map