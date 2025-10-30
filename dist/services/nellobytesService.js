"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const BASE = 'https://www.nellobytesystems.com';
function getEnv(key, fallback = '') {
    return process.env[key] || fallback;
}
// Support both legacy CLUB_KONNECT_* env names and newer NELLOBYTES_* names.
// This lets projects that already have CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in their
// .env continue working without changing env files.
const USERID = process.env.NELLOBYTES_USERID || process.env.CLUB_KONNECT_ID || '';
const APIKEY = process.env.NELLOBYTES_APIKEY || process.env.CLUB_KONNECT_APIKEY || '';
const CALLBACK = process.env.NELLOBYTES_CALLBACK_URL || process.env.CLUB_KONNECT_CALLBACK_URL || getEnv('NELLOBYTES_CALLBACK_URL');
function buildQuery(params) {
    const esc = encodeURIComponent;
    return Object.keys(params)
        .map((k) => `${esc(k)}=${esc(params[k])}`)
        .join('&');
}
async function callApi(path, params) {
    if (!USERID || !APIKEY) {
        throw new Error('Nellobytes credentials are not set. Please set NELLOBYTES_USERID/NELLOBYTES_APIKEY or CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in your environment');
    }
    const fullParams = Object.assign({}, params, {
        UserID: USERID,
        APIKey: APIKEY,
    });
    if (CALLBACK) {
        fullParams.CallBackURL = CALLBACK;
    }
    const url = `${BASE}/${path}?${buildQuery(fullParams)}`;
    const resp = await axios_1.default.get(url, { timeout: 15000 });
    return resp.data;
}
exports.default = {
    /**
     * Buy airtime
     * params: { MobileNetwork, Amount, MobileNumber, RequestID }
     */
    async buyAirtime(params) {
        return callApi('APIAirtimeV1.asp', params);
    },
    /**
     * Buy databundle
     * params: { MobileNetwork, DataPlan, MobileNumber, RequestID }
     */
    async buyDatabundle(params) {
        return callApi('APIDataBundleV1.asp', params);
    },
    /**
     * Buy cable tv subscription
     * params vary but typically include DecoderID, Network, Bouquet, Amount, RequestID
     */
    async buyCable(params) {
        return callApi('APICableTVV1.asp', params);
    },
    /**
     * Query transaction status by RequestID
     */
    async queryStatus(requestId) {
        return callApi('APIQueryV1.asp', { RequestID: requestId });
    },
    /**
     * Cancel transaction by RequestID
     */
    async cancel(requestId) {
        return callApi('APICancelV1.asp', { RequestID: requestId });
    },
};
//# sourceMappingURL=nellobytesService.js.map