// src/services/nellobytesService.ts
import axios from "axios";

const BASE_URL = "https://www.nellobytesystems.com";

// Get environment variables with fallbacks
function getEnv(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

// Support both legacy and new environment variable names
const USERID =
  process.env.NELLOBYTES_USERID || process.env.CLUB_KONNECT_ID || "";
const APIKEY =
  process.env.NELLOBYTES_APIKEY || process.env.CLUB_KONNECT_APIKEY || "";
const CALLBACK =
  process.env.NELLOBYTES_CALLBACK_URL ||
  process.env.CLUB_KONNECT_CALLBACK_URL ||
  "";

// Map our network names to Nellobytes API codes
export enum MobileNetworkCode {
  MTN = "01",
  GLO = "02",
  ETISALAT = "03",
  AIRTEL = "04",
}

interface NellobytesMobileNetworkResponse {
  MOBILE_NETWORK: {
    [network: string]: Array<{
      ID: string;
      PRODUCT: Array<{
        PRODUCT_SNO: string;
        PRODUCT_CODE: string;
        PRODUCT_ID: string;
        PRODUCT_NAME: string;
        PRODUCT_AMOUNT: string;
      }>;
    }>;
  };
}

// Response structure from Nellobytes API
export interface NellobytesResponse {
  orderid?: string;
  statuscode: string;
  status: string;
  requestid?: string;
  transid?: string;
}

// Data plan structure from Nellobytes API
export interface NellobytesDataPlan {
  dataplan_id: string; // e.g., "1000.01", "2500.01"
  plan_network: string; // e.g., "01" for MTN
  plan_name: string; // e.g., "1GB - 30 days (Direct Data)"
  plan_amount: string; // e.g., "N2,325.00"
  month_validate: string; // e.g., "30 days"
}

// Data needed for airtime purchase
export interface AirtimePurchaseParams {
  mobileNetwork: MobileNetworkCode;
  amount: number;
  mobileNumber: string;
  requestId?: string;
  bonusType?: string;
}

// Data needed for data bundle purchase
export interface DataBundlePurchaseParams {
  mobileNetwork: MobileNetworkCode;
  dataPlan: string; // This is the dataplan_id from the API
  mobileNumber: string;
  requestId?: string;
}

/**
 * Build URL query string from parameters
 */
function buildQuery(params: Record<string, any>): string {
  const esc = encodeURIComponent;
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${esc(key)}=${esc(params[key])}`)
    .join("&");
}

/**
 * Make API call to Nellobytesystems
 */
async function callApi(
  path: string,
  params: Record<string, any>
): Promise<NellobytesResponse> {
  // Validate credentials
  if (!USERID || !APIKEY) {
    throw new Error(
      "Nellobytes credentials are not set. " +
        "Please set NELLOBYTES_USERID/NELLOBYTES_APIKEY or CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in your environment"
    );
  }

  // Add required parameters
  const fullParams = {
    ...params,
    UserID: USERID,
    APIKey: APIKEY,
    CallBackURL: CALLBACK,
  };

  // Add callback URL if provided
  if (CALLBACK) {
    fullParams.CallBackURL = CALLBACK;
  }

  const url = `${BASE_URL}/${path}?${buildQuery(fullParams)}`;

  try {
    console.log(`📞 Calling Nellobytes API: ${path}`);
    console.log(`📋 Parameters:`, { ...fullParams, APIKey: "***" }); // Hide API key in logs

    const response = await axios.get(url, { timeout: 15000 });

    console.log(`✅ Nellobytes raw response:`, response.data);

    // Parse the response based on its format
    return parseNellobytesResponse(response.data);
  } catch (error: any) {
    console.error(`❌ Nellobytes API error (${path}):`, error.message);

    if (error.response) {
      // API returned an error status code
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);

      // Try to parse error response
      try {
        const errorResponse = parseNellobytesResponse(error.response.data);
        return errorResponse; // Return the error response for proper handling
      } catch (parseError) {
        throw new Error(
          `Nellobytes API error: ${error.response.status} - ${error.response.statusText}`
        );
      }
    } else if (error.request) {
      // No response received
      throw new Error(
        "No response from Nellobytes API - check your internet connection"
      );
    } else {
      // Other errors
      throw new Error(`Nellobytes API call failed: ${error.message}`);
    }
  }
}

/**
 * Parse Nellobytes API response which can be in different formats
 */
function parseNellobytesResponse(data: any): NellobytesResponse {
  if (typeof data === "string") {
    // Handle query string format: "orderid=123&statuscode=100&status=ORDER_RECEIVED"
    try {
      const params = new URLSearchParams(data);
      return {
        orderid: params.get("orderid") || undefined,
        statuscode: params.get("statuscode") || "500",
        status: params.get("status") || "UNKNOWN_ERROR",
        requestid: params.get("requestid") || undefined,
        transid: params.get("transid") || undefined,
      };
    } catch (error) {
      console.error("Failed to parse string response:", data);
      throw new Error(`Failed to parse Nellobytes response: ${data}`);
    }
  }

  // If response is already JSON
  if (typeof data === "object" && data !== null) {
    return {
      orderid: data.orderid || data.OrderID,
      statuscode:
        data.statuscode?.toString() || data.StatusCode?.toString() || "100",
      status: data.status || data.Status || "ORDER_RECEIVED",
      requestid: data.requestid || data.RequestID,
      transid: data.transid || data.TransID,
    };
  }

  console.error("Unexpected response type:", typeof data);
  throw new Error(`Unexpected response format from Nellobytes: ${typeof data}`);
}

/**
 * Convert our network name to Nellobytes code
 */
export function convertNetworkToCode(network: string): MobileNetworkCode {
  const codeMap: { [key: string]: MobileNetworkCode } = {
    mtn: MobileNetworkCode.MTN,
    glo: MobileNetworkCode.GLO,
    airtel: MobileNetworkCode.AIRTEL,
    etisalat: MobileNetworkCode.ETISALAT,
    "9mobile": MobileNetworkCode.ETISALAT, // Alias for etisalat
  };

  const code = codeMap[network.toLowerCase()];
  if (!code) {
    throw new Error(
      `Unsupported mobile network: ${network}. Supported: mtn, glo, airtel, etisalat, 9mobile`
    );
  }

  return code;
}

/**
 * Check if a Nellobytes response indicates success
 */
export function isSuccessfulResponse(response: NellobytesResponse): boolean {
  // Status code 100 typically means success, also check for ORDER_RECEIVED status
  return (
    response.statuscode === "100" ||
    response.statuscode === "200" ||
    response.status === "ORDER_RECEIVED"
  );
}

/**
 * Map Nellobytes status codes to user-friendly messages
 */
export function getStatusMessage(response: NellobytesResponse): string {
  const statusMessages: { [key: string]: string } = {
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

  return (
    statusMessages[response.status] ||
    statusMessages[response.statuscode] ||
    `Transaction status: ${response.status}`
  );
}

/**
 * Parse price string from Nellobytes (e.g., "N2,325.00" to 2325.00)
 */
export function parsePriceString(priceStr: string): number {
  // Remove currency symbol, commas, and parse as float
  const cleaned = priceStr.replace(/[N₦,\s]/g, "");
  const price = parseFloat(cleaned);

  if (isNaN(price)) {
    throw new Error(`Invalid price format: ${priceStr}`);
  }

  return price;
}

export class NellobytesService {
  /**
   * Buy airtime
   * @param params - Airtime purchase parameters
   * @returns Nellobytes API response
   */
  async buyAirtime(params: AirtimePurchaseParams): Promise<NellobytesResponse> {
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
  async buyDatabundle(
    params: DataBundlePurchaseParams
  ): Promise<NellobytesResponse> {
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
   * Fetch available data plans from Nellobytes API
   * @param network - Network code or name
   * @returns Array of data plans
   */
  /**
   * Fetch available data plans from Nellobytes API
   * @param network - Network code or name
   * @returns Array of data plans
   */
  async fetchDataPlans(network?: string): Promise<NellobytesDataPlan[]> {
    console.log("📋 Fetching data plans from Nellobytes API...");

    try {
      // Build URL - if network is provided, filter by network
      const url = network
        ? `${BASE_URL}/APIDatabundlePlansV2.asp?UserID=${USERID}`
        : `${BASE_URL}/APIDatabundlePlansV2.asp?UserID=${USERID}`;

      console.log(`📞 Calling: ${url}`);

      const response = await axios.get<NellobytesMobileNetworkResponse>(url, {
        timeout: 30000,
      });

      console.log("📋 Raw data plans response type:", typeof response.data);

      // Parse response based on format
      let plans: NellobytesDataPlan[] = [];

      if (Array.isArray(response.data)) {
        // Response is already an array of plans
        plans = response.data;
      } else if (typeof response.data === "object" && response.data !== null) {
        // Response might be an object with plans nested
        const data = response.data as any; // Type assertion to avoid TypeScript errors

        if (data.plans) {
          plans = data.plans;
        } else if (data.data) {
          plans = data.data;
        } else if (data.MOBILE_NETWORK) {
          // Handle the nested structure from your example response
          plans = this.parseMobileNetworkData(data.MOBILE_NETWORK);
        } else {
          // Try to extract plans from object values
          plans = Object.values(data).filter(
            (item: any) => item && typeof item === "object" && item.dataplan_id
          ) as NellobytesDataPlan[];
        }
      }

      console.log(`✅ Fetched ${plans.length} data plans from API`);

      // Filter by network if specified
      if (network) {
        const networkCode =
          typeof network === "string" && network.length <= 2
            ? network
            : convertNetworkToCode(network);

        plans = plans.filter((plan) => plan.plan_network === networkCode);
        console.log(
          `📋 Filtered to ${plans.length} plans for network ${networkCode}`
        );
      }

      return plans;
    } catch (error: any) {
      console.error("❌ Failed to fetch data plans:", error.message);

      if (error.response) {
        console.error("Response data:", error.response.data);
      }

      throw new Error(
        `Failed to fetch data plans from Nellobytes: ${error.message}`
      );
    }
  }

  /**
   * Parse the complex MOBILE_NETWORK structure from Nellobytes API
   */
  private parseMobileNetworkData(mobileNetworkData: any): NellobytesDataPlan[] {
    const plans: NellobytesDataPlan[] = [];

    try {
      // Iterate through each network (MTN, GLO, etc.)
      Object.keys(mobileNetworkData).forEach((networkKey) => {
        const networkArray = mobileNetworkData[networkKey];

        if (Array.isArray(networkArray)) {
          networkArray.forEach((networkItem) => {
            if (networkItem.PRODUCT && Array.isArray(networkItem.PRODUCT)) {
              // Convert each PRODUCT to NellobytesDataPlan format
              networkItem.PRODUCT.forEach((product: any) => {
                const plan: NellobytesDataPlan = {
                  dataplan_id: product.PRODUCT_ID,
                  plan_network: networkItem.ID,
                  plan_name: product.PRODUCT_NAME,
                  plan_amount: product.PRODUCT_AMOUNT,
                  month_validate: this.extractValidityPeriod(
                    product.PRODUCT_NAME
                  ),
                };
                plans.push(plan);
              });
            }
          });
        }
      });

      console.log(
        `📋 Parsed ${plans.length} plans from MOBILE_NETWORK structure`
      );
    } catch (error) {
      console.error("❌ Error parsing MOBILE_NETWORK data:", error);
    }

    return plans;
  }

  /**
   * Extract validity period from product name
   */
  private extractValidityPeriod(productName: string): string {
    // Try to extract validity period like "30 days", "7 days", etc.
    const match = productName.match(/(\d+)\s*(day|month|week)s?/i);
    if (match) {
      return `${match[1]} ${match[2].toLowerCase()}${
        match[1] === "1" ? "" : "s"
      }`;
    }
    return "Unknown";
  }

  /**
   * Query transaction status by RequestID or OrderID
   */
  async queryStatus(
    requestId?: string,
    orderId?: string
  ): Promise<NellobytesResponse> {
    if (!requestId && !orderId) {
      throw new Error("Either requestId or orderId must be provided");
    }

    console.log("🔍 Querying transaction status:", { requestId, orderId });

    const params: any = {};
    if (requestId) params.RequestID = requestId;
    if (orderId) params.OrderID = orderId;

    const response = await callApi("APIQueryV1.asp", params);

    console.log("🔍 Query status response:", {
      orderid: response.orderid,
      status: response.status,
      statuscode: response.statuscode,
    });

    return response;
  }

  /**
   * Cancel transaction by RequestID
   */
  async cancelTransaction(requestId: string): Promise<NellobytesResponse> {
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
  async purchaseAirtimeSimple(
    network: string,
    amount: number,
    phoneNumber: string,
    requestId?: string
  ): Promise<NellobytesResponse> {
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
  async purchaseDataBundle(
    network: string,
    dataplanId: string,
    phoneNumber: string,
    requestId?: string
  ): Promise<NellobytesResponse> {
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
   * Check API balance (if supported by Nellobytes)
   */
  async checkBalance(): Promise<any> {
    console.log("💳 Checking Nellobytes API balance");

    try {
      // Note: Balance endpoint may vary, adjust as needed
      const response = await callApi("APIBalanceV1.asp", {});
      console.log("💳 Balance response:", response);
      return response;
    } catch (error: any) {
      console.error("❌ Balance check failed:", error.message);
      throw error;
    }
  }

  // Export helper functions
  helpers = {
    convertNetworkToCode,
    isSuccessfulResponse,
    parseNellobytesResponse,
    getStatusMessage,
    parsePriceString,
  };
}

// Export singleton instance
const nellobytesService = new NellobytesService();
export default nellobytesService;

// Also export the class for testing purposes
export { NellobytesService as NellobytesServiceClass };

// Export helper functions at module level for backward compatibility
export {
  convertNetworkToCode as convertNetworkToCodeHelper,
  isSuccessfulResponse as isSuccessfulResponseHelper,
  parseNellobytesResponse as parseNellobytesResponseHelper,
  getStatusMessage as getStatusMessageHelper,
  parsePriceString as parsePriceStringHelper,
};
