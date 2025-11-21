"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NellobytesServiceClass = exports.NellobytesService = exports.MobileNetworkCode = void 0;
exports.convertNetworkToCode = convertNetworkToCode;
exports.convertNetworkToCodeHelper = convertNetworkToCode;
exports.isSuccessfulResponse = isSuccessfulResponse;
exports.isSuccessfulResponseHelper = isSuccessfulResponse;
exports.getStatusMessage = getStatusMessage;
exports.getStatusMessageHelper = getStatusMessage;
exports.parsePriceString = parsePriceString;
exports.parsePriceStringHelper = parsePriceString;
exports.parseNellobytesResponseHelper = parseNellobytesResponse;
// src/services/nellobytesService.ts - FIXED
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
        throw new Error("Nellobytes credentials are not set. " +
            "Please set NELLOBYTES_USERID/NELLOBYTES_APIKEY or CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in your environment");
    }
    // Add required parameters
    const fullParams = {
        UserID: USERID,
        APIKey: APIKEY,
        ...params,
    };
    // Add callback URL if provided and not empty
    if (CALLBACK && CALLBACK.trim() !== "") {
        fullParams.CallBackURL = CALLBACK;
    }
    // For Nellobytes, build the URL with parameters directly in the path
    const queryString = buildQuery(fullParams);
    const url = `${BASE_URL}/${path}?${queryString}`;
    try {
        console.log(`📞 Calling Nellobytes API: ${path}`);
        console.log(`📋 Parameters:`, { ...fullParams, APIKey: "***" });
        console.log(`🔗 Full URL: ${url.replace(APIKEY, "***")}`);
        const response = await axios_1.default.get(url, { timeout: 15000 });
        console.log(`✅ Nellobytes raw response:`, response.data);
        console.log(`🔐 Using Credentials - UserID: ${USERID}, APIKey: ${APIKEY ? "***" + APIKEY.slice(-4) : "MISSING"}`);
        return parseNellobytesResponse(response.data);
    }
    catch (error) {
        console.error(`❌ Nellobytes API error (${path}):`, error.message);
        if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error(`Response data:`, error.response.data);
            try {
                const errorResponse = parseNellobytesResponse(error.response.data);
                return errorResponse;
            }
            catch (parseError) {
                throw new Error(`Nellobytes API error: ${error.response.status} - ${error.response.statusText}`);
            }
        }
        else if (error.request) {
            throw new Error("No response from Nellobytes API - check your internet connection");
        }
        else {
            throw new Error(`Nellobytes API call failed: ${error.message}`);
        }
    }
}
/**
 * Parse Nellobytes API response which can be in different formats
 */
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
            // ADD CUSTOMER NAME FIELD
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
            // ADD CUSTOMER NAME FIELD - check multiple possible field names
            customer_name: data.customer_name ||
                data.name ||
                data.CustomerName ||
                data.customerName ||
                undefined,
        };
    }
    throw new Error(`Unexpected response format from Nellobytes`);
}
/**
 * Convert our network name to Nellobytes code
 */
function convertNetworkToCode(network) {
    const codeMap = {
        mtn: MobileNetworkCode.MTN,
        glo: MobileNetworkCode.GLO,
        airtel: MobileNetworkCode.AIRTEL,
        etisalat: MobileNetworkCode.ETISALAT,
        "9mobile": MobileNetworkCode.ETISALAT, // Alias for etisalat
    };
    const code = codeMap[network.toLowerCase()];
    if (!code) {
        throw new Error(`Unsupported mobile network: ${network}. Supported: mtn, glo, airtel, etisalat, 9mobile`);
    }
    return code;
}
/**
 * Check if a Nellobytes response indicates success
 */
function isSuccessfulResponse(response) {
    const successStatusCodes = ["00", "100", "200", "201"];
    const successStatusMessages = [
        "ORDER_RECEIVED",
        "ORDER_COMPLETED",
        "SUCCESS",
        "COMPLETED",
    ];
    // Check if status code indicates success
    if (response.statuscode && successStatusCodes.includes(response.statuscode)) {
        return true;
    }
    // Check if status message indicates success
    if (response.status && successStatusMessages.includes(response.status)) {
        return true;
    }
    // For electricity purchases, status "00" usually means success
    if (response.status === "00" || response.statuscode === "00") {
        return true;
    }
    return false;
}
/**
 * Map Nellobytes status codes to user-friendly messages
 */
function getStatusMessage(response) {
    const statusMessages = {
        "100": "Transaction successful",
        "200": "Transaction successful",
        ORDER_RECEIVED: "Order received and processing",
        INVALID_CREDENTIALS: "Invalid API credentials",
        MISSING_CREDENTIALS: "API credentials missing",
        INVALID_AMOUNT: "Invalid amount specified",
        MINIMUM_50: "Minimum amount is 50 NGN",
        MINIMUM_200000: "Maximum amount is 200,000 NGN",
        INVALID_RECIPIENT: "Invalid phone number",
        INVALID_PRODUCT_CODE: "Invalid data plan selected",
        SERVICE_TEMPORARILY_UNAVAIALBLE: "Service temporarily unavailable",
        INSUFFICIENT_APIBALANCE: "Insufficient provider balance",
        INVALID_NETWORK: "Invalid network selected",
        TRANSACTION_FAILED: "Transaction failed",
    };
    return (statusMessages[response.status ?? ""] ||
        statusMessages[response.statuscode ?? ""] ||
        `Transaction status: ${response.status ?? "unknown"}`);
}
/**
 * Parse price string from Nellobytes (e.g., "N2,325.00" to 2325.00)
 */
function parsePriceString(priceStr) {
    // Remove currency symbol, commas, and parse as float
    const cleaned = priceStr.replace(/[N₦,\s]/g, "");
    const price = parseFloat(cleaned);
    if (isNaN(price)) {
        throw new Error(`Invalid price format: ${priceStr}`);
    }
    return price;
}
class NellobytesService {
    constructor() {
        // Export helper functions
        this.helpers = {
            convertNetworkToCode,
            isSuccessfulResponse,
            parseNellobytesResponse,
            getStatusMessage,
            parsePriceString,
        };
    }
    /**
     * Buy airtime
     * @param params - Airtime purchase parameters
     * @returns Nellobytes API response
     */
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
        const response = await callApi("APIAirtimeV1.asp", nellobytesParams);
        console.log("📱 Airtime purchase response:", {
            orderid: response.orderid,
            status: response.status,
            statuscode: response.statuscode,
        });
        return response;
    }
    /**
     * Buy data bundle
     * @param params - Data bundle purchase parameters
     * @returns Nellobytes API response
     */
    async buyDatabundle(params) {
        console.log("📊 Purchasing data bundle:", {
            network: params.mobileNetwork,
            dataPlan: params.dataPlan,
            phone: params.mobileNumber,
        });
        const nellobytesParams = {
            MobileNetwork: params.mobileNetwork,
            DataPlan: params.dataPlan,
            MobileNumber: params.mobileNumber,
            ...(params.requestId && { RequestID: params.requestId }),
        };
        const response = await callApi("APIDatabundleV1.asp", nellobytesParams);
        console.log("📊 Data bundle purchase response:", {
            orderid: response.orderid,
            status: response.status,
            statuscode: response.statuscode,
        });
        return response;
    }
    /**
     * Buy electricity - FIXED VERSION
     * @param params - Electricity purchase parameters
     * @returns Nellobytes API response
     */
    async buyElectricity(params) {
        console.log("⚡ Purchasing electricity:", {
            company: params.electricCompany,
            meterType: params.meterType,
            meterNo: params.meterNo,
            phoneNo: params.phoneNo,
            amount: params.amount,
        });
        // Build parameters in the EXACT order and format that Nellobytes expects
        const nellobytesParams = {
            ElectricCompany: params.electricCompany,
            MeterType: params.meterType,
            MeterNo: params.meterNo,
            Amount: params.amount.toString(),
            PhoneNo: params.phoneNo,
            // ADD REQUIRED REQUESTID PARAMETER:
            RequestID: `VELO_ELECTRICITY_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 9)}`,
        };
        // Add callback URL if provided
        if (CALLBACK && CALLBACK.trim() !== "") {
            nellobytesParams.CallBackURL = CALLBACK;
        }
        const response = await callApi("APIElectricityV1.asp", nellobytesParams);
        console.log("⚡ Electricity purchase response:", {
            orderid: response.orderid,
            status: response.status,
            statuscode: response.statuscode,
            meterno: response.meterno,
            metertoken: response.metertoken,
        });
        return response;
    }
    /**
     * Verify electricity meter number
     * @param electricCompany - Company code (01-12)
     * @param meterNo - Meter number to verify
     * @returns Nellobytes API response
     */
    async verifyElectricityMeter(electricCompany, meterNo) {
        console.log(" Verifying meter:", { company: electricCompany, meterNo });
        const nellobytesParams = {
            ElectricCompany: electricCompany,
            MeterNo: meterNo,
        };
        const response = await callApi("APIVerifyElectricityV1.asp", nellobytesParams);
        console.log(" Meter verification response:", {
            status: response.status,
            statuscode: response.statuscode,
            meterno: response.meterno,
        });
        return response;
    }
    /**
     * Fetch electricity companies and their details from Nellobytes API
     * @returns Array of electricity companies
     */
    async fetchElectricityCompanies() {
        console.log("⚡ Fetching electricity companies from Nellobytes API...");
        try {
            const url = `${BASE_URL}/APIElectricityDiscosV1.asp?UserID=${USERID}`;
            console.log(`📞 Calling: ${url}`);
            const response = await axios_1.default.get(url, {
                timeout: 30000,
            });
            console.log("⚡ Raw electricity companies response type:", typeof response.data);
            // Parse response based on format
            let companies = [];
            if (Array.isArray(response.data)) {
                companies = response.data;
            }
            else if (typeof response.data === "object" && response.data !== null) {
                const data = response.data;
                if (data.companies) {
                    companies = data.companies;
                }
                else if (data.data) {
                    companies = data.data;
                }
                else if (data.ELECTRIC_COMPANY) {
                    // Handle the nested structure from the API
                    companies = this.parseElectricCompanyData(data.ELECTRIC_COMPANY);
                }
                else {
                    companies = Object.values(data).filter((item) => item && typeof item === "object" && item.company_id);
                }
            }
            console.log(`✅ Fetched ${companies.length} electricity companies from API`);
            return companies;
        }
        catch (error) {
            console.error("❌ Failed to fetch electricity companies:", error.message);
            if (error.response) {
                console.error("Response data:", error.response.data);
            }
            throw new Error(`Failed to fetch electricity companies from Nellobytes: ${error.message}`);
        }
    }
    /**
     * Parse the complex ELECTRIC_COMPANY structure from Nellobytes API
     */
    parseElectricCompanyData(electricCompanyData) {
        const companies = [];
        try {
            // Iterate through each company (EKO_ELECTRIC, IKEJA_ELECTRIC, etc.)
            Object.keys(electricCompanyData).forEach((companyKey) => {
                const companyArray = electricCompanyData[companyKey];
                if (Array.isArray(companyArray)) {
                    companyArray.forEach((companyItem) => {
                        if (companyItem.PRODUCT && Array.isArray(companyItem.PRODUCT)) {
                            // Check what products are available
                            let prepaidAvailable = false;
                            let postpaidAvailable = false;
                            let minAmount = 1000;
                            let maxAmount = 200000;
                            companyItem.PRODUCT.forEach((product) => {
                                if (product.PRODUCT_TYPE === "prepaid") {
                                    prepaidAvailable = true;
                                }
                                if (product.PRODUCT_TYPE === "postpaid") {
                                    postpaidAvailable = true;
                                }
                                // Get min/max amounts
                                if (product.MINAMOUNT) {
                                    minAmount = Math.max(minAmount, parseInt(product.MINAMOUNT));
                                }
                                if (product.MAXAMOUNT) {
                                    maxAmount = parseInt(product.MAXAMOUNT);
                                }
                            });
                            const company = {
                                company_id: companyItem.ID,
                                company_name: companyItem.NAME,
                                prepaid_available: prepaidAvailable,
                                postpaid_available: postpaidAvailable,
                                min_amount: minAmount,
                                max_amount: maxAmount,
                            };
                            companies.push(company);
                        }
                    });
                }
            });
            console.log(`⚡ Parsed ${companies.length} companies from ELECTRIC_COMPANY structure`);
        }
        catch (error) {
            console.error("❌ Error parsing ELECTRIC_COMPANY data:", error);
        }
        return companies;
    }
    /**
     * Fetch available data plans from Nellobytes API
     * @param network - Network code or name
     * @returns Array of data plans
     */
    async fetchDataPlans(network) {
        console.log("📋 Fetching data plans from Nellobytes API...");
        try {
            // Build URL - if network is provided, filter by network
            const url = network
                ? `${BASE_URL}/APIDatabundlePlansV2.asp?UserID=${USERID}`
                : `${BASE_URL}/APIDatabundlePlansV2.asp?UserID=${USERID}`;
            console.log(`📞 Calling: ${url}`);
            const response = await axios_1.default.get(url, {
                timeout: 30000,
            });
            console.log("📋 Raw data plans response type:", typeof response.data);
            // Parse response based on format
            let plans = [];
            if (Array.isArray(response.data)) {
                // Response is already an array of plans
                plans = response.data;
            }
            else if (typeof response.data === "object" && response.data !== null) {
                // Response might be an object with plans nested
                const data = response.data; // Type assertion to avoid TypeScript errors
                if (data.plans) {
                    plans = data.plans;
                }
                else if (data.data) {
                    plans = data.data;
                }
                else if (data.MOBILE_NETWORK) {
                    // Handle the nested structure from your example response
                    plans = this.parseMobileNetworkData(data.MOBILE_NETWORK);
                }
                else {
                    // Try to extract plans from object values
                    plans = Object.values(data).filter((item) => item && typeof item === "object" && item.dataplan_id);
                }
            }
            console.log(`✅ Fetched ${plans.length} data plans from API`);
            // Filter by network if specified
            if (network) {
                const networkCode = typeof network === "string" && network.length <= 2
                    ? network
                    : convertNetworkToCode(network);
                plans = plans.filter((plan) => plan.plan_network === networkCode);
                console.log(`📋 Filtered to ${plans.length} plans for network ${networkCode}`);
            }
            return plans;
        }
        catch (error) {
            console.error("❌ Failed to fetch data plans:", error.message);
            if (error.response) {
                console.error("Response data:", error.response.data);
            }
            throw new Error(`Failed to fetch data plans from Nellobytes: ${error.message}`);
        }
    }
    /**
     * Parse the complex MOBILE_NETWORK structure from Nellobytes API
     */
    parseMobileNetworkData(mobileNetworkData) {
        const plans = [];
        try {
            // Iterate through each network (MTN, GLO, etc.)
            Object.keys(mobileNetworkData).forEach((networkKey) => {
                const networkArray = mobileNetworkData[networkKey];
                if (Array.isArray(networkArray)) {
                    networkArray.forEach((networkItem) => {
                        if (networkItem.PRODUCT && Array.isArray(networkItem.PRODUCT)) {
                            // Convert each PRODUCT to NellobytesDataPlan format
                            networkItem.PRODUCT.forEach((product) => {
                                const plan = {
                                    dataplan_id: product.PRODUCT_ID,
                                    plan_network: networkItem.ID,
                                    plan_name: product.PRODUCT_NAME,
                                    plan_amount: product.PRODUCT_AMOUNT,
                                    month_validate: this.extractValidityPeriod(product.PRODUCT_NAME),
                                };
                                plans.push(plan);
                            });
                        }
                    });
                }
            });
            console.log(`📋 Parsed ${plans.length} plans from MOBILE_NETWORK structure`);
        }
        catch (error) {
            console.error("❌ Error parsing MOBILE_NETWORK data:", error);
        }
        return plans;
    }
    /**
     * Extract validity period from product name
     */
    extractValidityPeriod(productName) {
        // Try to extract validity period like "30 days", "7 days", etc.
        const match = productName.match(/(\d+)\s*(day|month|week)s?/i);
        if (match) {
            return `${match[1]} ${match[2].toLowerCase()}${match[1] === "1" ? "" : "s"}`;
        }
        return "Unknown";
    }
    /**
     * Query transaction status by RequestID or OrderID
     */
    async queryStatus(requestId, orderId) {
        if (!requestId && !orderId) {
            throw new Error("Either requestId or orderId must be provided");
        }
        console.log(" Querying transaction status:", { requestId, orderId });
        const params = {};
        if (requestId)
            params.RequestID = requestId;
        if (orderId)
            params.OrderID = orderId;
        const response = await callApi("APIQueryV1.asp", params);
        console.log(" Query status response:", {
            orderid: response.orderid,
            status: response.status,
            statuscode: response.statuscode,
        });
        return response;
    }
    /**
     * Cancel transaction by RequestID
     */
    async cancelTransaction(requestId) {
        console.log("🚫 Cancelling transaction:", requestId);
        const response = await callApi("APICancelV1.asp", { RequestID: requestId });
        console.log("🚫 Cancel transaction response:", {
            status: response.status,
            statuscode: response.statuscode,
        });
        return response;
    }
    /**
     * Utility function to purchase airtime using network name instead of code
     */
    async purchaseAirtimeSimple(network, amount, phoneNumber, requestId) {
        console.log("💰 Simple airtime purchase:", {
            network,
            amount,
            phoneNumber,
        });
        const networkCode = convertNetworkToCode(network);
        return this.buyAirtime({
            mobileNetwork: networkCode,
            amount,
            mobileNumber: phoneNumber,
            requestId,
        });
    }
    /**
     * Utility function to purchase data bundle using network name and dataplan_id
     */
    async purchaseDataBundle(network, dataplanId, phoneNumber, requestId) {
        console.log("📊 Simple data bundle purchase:", {
            network,
            dataplanId,
            phoneNumber,
        });
        const networkCode = convertNetworkToCode(network);
        return this.buyDatabundle({
            mobileNetwork: networkCode,
            dataPlan: dataplanId,
            mobileNumber: phoneNumber,
            requestId,
        });
    }
    /**
     * Utility function to purchase electricity - FIXED VERSION
     */
    async purchaseElectricity(electricCompany, meterType, meterNo, phoneNo, amount, requestId // Keep this for your internal tracking, but don't send to Nellobytes
    ) {
        console.log("⚡ Simple electricity purchase:", {
            electricCompany,
            meterType,
            meterNo,
            phoneNo,
            amount,
        });
        // Don't include requestId in the parameters sent to Nellobytes
        // The RequestID will be generated automatically in buyElectricity method
        return this.buyElectricity({
            electricCompany,
            meterType,
            meterNo,
            phoneNo,
            amount,
        });
    }
    /**
     * Check API balance (if supported by Nellobytes)
     */
    async checkBalance() {
        console.log("💳 Checking Nellobytes API balance");
        try {
            // Note: Balance endpoint may vary, adjust as needed
            const response = await callApi("APIBalanceV1.asp", {});
            console.log("💳 Balance response:", response);
            return response;
        }
        catch (error) {
            console.error("❌ Balance check failed:", error.message);
            throw error;
        }
    }
}
exports.NellobytesService = NellobytesService;
exports.NellobytesServiceClass = NellobytesService;
// Export singleton instance
const nellobytesService = new NellobytesService();
exports.default = nellobytesService;
//# sourceMappingURL=nellobytesService.js.map