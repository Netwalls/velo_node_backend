// Copied from src/services/nellobytesService.ts
import axios from "axios";

const BASE_URL = "https://www.nellobytesystems.com";

// Get environment variables with fallbacks
function getEnv(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

// Support both legacy and new environment variable names
const USERID = process.env.CLUB_KONNECT_ID || "CK101265516";
const APIKEY =
  process.env.CLUB_KONNECT_APIKEY || process.env.NELLOBYTES_APIKEY || "";
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

// Response structure from Nellobytes API
export interface NellobytesResponse {
  orderid?: string;
  statuscode?: string;
  status?: string;
  requestid?: string;
  transid?: string;
  meterno?: string;
  metertoken?: string;
  customer_name?: string;
}

// Data needed for airtime purchase
export interface AirtimePurchaseParams {
  mobileNetwork: MobileNetworkCode;
  amount: number;
  mobileNumber: string;
  requestId?: string;
  bonusType?: string;
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

async function callApi(
  path: string,
  params: Record<string, any>
): Promise<NellobytesResponse> {
  // Validate credentials
  if (!USERID || !APIKEY) {
    throw new Error("Nellobytes credentials are not set.");
  }

  // Add required parameters
  const fullParams: Record<string, any> = {
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
    const response = await axios.get(url, { timeout: 15000 });
    return parseNellobytesResponse(response.data);
  } catch (error: any) {
    console.error(`❌ Nellobytes API error (${path}):`, error.message);
    throw new Error(`Nellobytes API call failed: ${error.message}`);
  }
}

function parseNellobytesResponse(data: any): NellobytesResponse {
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
      customer_name:
        params.get("customer_name") || params.get("name") || undefined,
    };
  }

  if (typeof data === "object" && data !== null) {
    const status = data.status || data.Status || undefined;
    const statuscode =
      data.statuscode?.toString() ||
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
      customer_name:
        data.customer_name ||
        data.name ||
        data.CustomerName ||
        data.customerName ||
        undefined,
    };
  }

  throw new Error(`Unexpected response format from Nellobytes`);
}

export function convertNetworkToCode(network: string): MobileNetworkCode {
  const codeMap: { [key: string]: MobileNetworkCode } = {
    mtn: MobileNetworkCode.MTN,
    glo: MobileNetworkCode.GLO,
    airtel: MobileNetworkCode.AIRTEL,
    etisalat: MobileNetworkCode.ETISALAT,
    "9mobile": MobileNetworkCode.ETISALAT,
  };

  const code = codeMap[network.toLowerCase()];
  if (!code) {
    throw new Error(
      `Unsupported mobile network: ${network}. Supported: mtn, glo, airtel, etisalat, 9mobile`
    );
  }

  return code;
}

export function isSuccessfulResponse(response: NellobytesResponse): boolean {
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

export class NellobytesService {
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

    return await callApi("APIAirtimeV1.asp", nellobytesParams);
  }

  async purchaseAirtimeSimple(
    network: string,
    amount: number,
    phoneNumber: string,
    requestId?: string
  ): Promise<NellobytesResponse> {
    const networkCode = convertNetworkToCode(network);

    return this.buyAirtime({
      mobileNetwork: networkCode,
      amount,
      mobileNumber: phoneNumber,
      requestId,
    });
  }
}

export default new NellobytesService();
