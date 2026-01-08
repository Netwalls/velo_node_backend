"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NellobytesService = exports.MobileNetworkCode = void 0;
exports.convertNetworkToCode = convertNetworkToCode;
exports.isSuccessfulResponse = isSuccessfulResponse;
// Copied from src/services/nellobytesService.ts
const axios_1 = __importDefault(require("axios"));
const BASE_URL = "https://www.nellobytesystems.com";
// Get environment variables with fallbacks
function getEnv(key, fallback = "") {
    return process.env[key] || fallback;
}
// Support both legacy and new environment variable names
const USERID = "CK101265322";
const APIKEY = "BI4HSJA5821F0N95B85F52L329551U5OMGDQ2C70EW81GCRLFD84678KGR252LAO";
const CALLBACK = process.env.NELLOBYTES_CALLBACK_URL ||
    process.env.CLUB_KONNECT_CALLBACK_URL ||
    "";
// Map our network names to Nellobytes API codes
var MobileNetworkCode;
(function (MobileNetworkCode) {
    MobileNetworkCode["MTN"] = "01";
    MobileNetworkCode["GLO"] = "02";
    MobileNetworkCode["ETISALAT"] = "03";
    MobileNetworkCode["AIRTEL"] = "04";
})(MobileNetworkCode || (exports.MobileNetworkCode = MobileNetworkCode = {}));
/**
 * Build URL query string from parameters
 */
function buildQuery(params) {
    const esc = encodeURIComponent;
    return Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== null)
        .map((key) => `${esc(key)}=${esc(params[key])}`)
        .join("&");
}
async function callApi(path, params) {
    // Validate credentials
    if (!USERID || !APIKEY) {
        throw new Error("Nellobytes credentials are not set.");
    }
    // Add required parameters
    const fullParams = {
        UserID: USERID,
        APIKey: APIKEY,
        ...params,
    };
    if (CALLBACK && CALLBACK.trim() !== "") {
        fullParams.CallBackURL = CALLBACK;
    }
    const queryString = buildQuery(fullParams);
    const url = `${BASE_URL}/${path}?${queryString}`;
    try {
        console.log(`📞 Calling Nellobytes API: ${path}`);
        const response = await axios_1.default.get(url, { timeout: 15000 });
        return parseNellobytesResponse(response.data);
    }
    catch (error) {
        console.error(`❌ Nellobytes API error (${path}):`, error.message);
        throw new Error(`Nellobytes API call failed: ${error.message}`);
    }
}
function parseNellobytesResponse(data) {
    if (typeof data === "string") {
        const params = new URLSearchParams(data);
        return {
            orderid: params.get("orderid") || undefined,
            statuscode: params.get("statuscode") || undefined,
            status: params.get("status") || undefined,
            requestid: params.get("requestid") || undefined,
            transid: params.get("transid") || undefined,
            meterno: params.get("meterno") || undefined,
            metertoken: params.get("metertoken") || undefined,
            customer_name: params.get("customer_name") || params.get("name") || undefined,
        };
    }
    if (typeof data === "object" && data !== null) {
        const status = data.status || data.Status || undefined;
        const statuscode = data.statuscode?.toString() ||
            data.StatusCode?.toString() ||
            (status === "00" ? "00" : undefined);
        return {
            orderid: data.orderid || data.OrderID,
            statuscode,
            status,
            requestid: data.requestid || data.RequestID,
            transid: data.transid || data.TransID,
            meterno: data.meterno || data.MeterNo,
            metertoken: data.metertoken || data.MeterToken,
            customer_name: data.customer_name ||
                data.name ||
                data.CustomerName ||
                data.customerName ||
                undefined,
        };
    }
    throw new Error(`Unexpected response format from Nellobytes`);
}
function convertNetworkToCode(network) {
    const codeMap = {
        mtn: MobileNetworkCode.MTN,
        glo: MobileNetworkCode.GLO,
        airtel: MobileNetworkCode.AIRTEL,
        etisalat: MobileNetworkCode.ETISALAT,
        "9mobile": MobileNetworkCode.ETISALAT,
    };
    const code = codeMap[network.toLowerCase()];
    if (!code) {
        throw new Error(`Unsupported mobile network: ${network}. Supported: mtn, glo, airtel, etisalat, 9mobile`);
    }
    return code;
}
function isSuccessfulResponse(response) {
    const successStatusCodes = ["00", "100", "200", "201"];
    const successStatusMessages = [
        "ORDER_RECEIVED",
        "ORDER_COMPLETED",
        "SUCCESS",
        "COMPLETED",
    ];
    if (response.statuscode && successStatusCodes.includes(response.statuscode)) {
        return true;
    }
    if (response.status && successStatusMessages.includes(response.status)) {
        return true;
    }
    if (response.status === "00" || response.statuscode === "00") {
        return true;
    }
    return false;
}
class NellobytesService {
    async buyAirtime(params) {
        console.log("💰 Purchasing airtime:", {
            network: params.mobileNetwork,
            amount: params.amount,
            phone: params.mobileNumber,
        });
        const nellobytesParams = {
            MobileNetwork: params.mobileNetwork,
            Amount: params.amount.toString(),
            MobileNumber: params.mobileNumber,
            ...(params.requestId && { RequestID: params.requestId }),
            ...(params.bonusType && { BonusType: params.bonusType }),
        };
        return await callApi("APIAirtimeV1.asp", nellobytesParams);
    }
    async purchaseAirtimeSimple(network, amount, phoneNumber, requestId) {
        const networkCode = convertNetworkToCode(network);
        return this.buyAirtime({
            mobileNetwork: networkCode,
            amount,
            mobileNumber: phoneNumber,
            requestId
        });
    }
}
exports.NellobytesService = NellobytesService;
exports.default = new NellobytesService();
