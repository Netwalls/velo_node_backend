"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoonpayService = void 0;
const crypto = __importStar(require("crypto"));
/**
 * Minimal MoonPay adapter.
 *
 * Notes:
 * - This implementation uses a hosted-checkout style transaction creation.
 * - It relies on environment variables: `MOONPAY_BASE_URL`, `MOONPAY_API_KEY`, `MOONPAY_API_SECRET`.
 * - MoonPay's exact signing requirements may differ; if they provide a signature scheme,
 *   adapt the `X-Signature` generation accordingly. This code uses an HMAC-SHA256
 *   over the JSON body when `MOONPAY_API_SECRET` is present as a sensible default.
 */
class MoonpayService {
    static async createTransaction(payload) {
        const baseUrl = process.env.MOONPAY_BASE_URL || 'https://api.moonpay.io';
        const url = `${baseUrl}/v3/transactions`;
        const apiKey = process.env.MOONPAY_API_KEY;
        const apiSecret = process.env.MOONPAY_API_SECRET;
        const body = JSON.stringify(payload);
        const headers = {
            'Content-Type': 'application/json',
        };
        if (apiKey) {
            // MoonPay may expect an Authorization header or an x-api-key header depending on account type.
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['X-API-KEY'] = apiKey;
        }
        if (apiSecret) {
            // Default to HMAC-SHA256 over body as a helpful placeholder. Replace if MoonPay docs specify otherwise.
            try {
                const signature = crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
                headers['X-Signature'] = signature;
            }
            catch (err) {
                console.warn('Failed to compute MoonPay signature (continuing without signature):', err);
            }
        }
        const resp = await fetch(url, { method: 'POST', headers, body });
        const text = await resp.text();
        let data = text;
        try {
            data = JSON.parse(text);
        }
        catch (_) { /* leave as text */ }
        return { ok: resp.ok, status: resp.status, data };
    }
}
exports.MoonpayService = MoonpayService;
exports.default = MoonpayService;
//# sourceMappingURL=moonpayService.js.map