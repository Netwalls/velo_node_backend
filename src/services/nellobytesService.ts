import axios from 'axios';

const BASE_URL = 'https://www.nellobytesystems.com';

// Get environment variables with fallbacks
function getEnv(key: string, fallback = ''): string {
    return process.env[key] || fallback;
}

// Support both legacy and new environment variable names
const USERID = process.env.NELLOBYTES_USERID || process.env.CLUB_KONNECT_ID || '';
const APIKEY = process.env.NELLOBYTES_APIKEY || process.env.CLUB_KONNECT_APIKEY || '';
const CALLBACK = process.env.NELLOBYTES_CALLBACK_URL || process.env.CLUB_KONNECT_CALLBACK_URL || '';

// Map our network names to Nellobytes API codes
export enum MobileNetworkCode {
    MTN = '01',
    GLO = '02',
    ETISALAT = '03',
    AIRTEL = '04',
}

// Response structure from Nellobytes API
export interface NellobytesResponse {
    orderid?: string; 
    statuscode: string; 
    status: string;    
    requestid?: string;
    transid?: string;   
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
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map((key) => `${esc(key)}=${esc(params[key])}`)
        .join('&');
}

/**
 * Make API call to Nellobytesystems
 */
async function callApi(path: string, params: Record<string, any>): Promise<NellobytesResponse> {
    // Validate credentials
    if (!USERID || !APIKEY) {
        throw new Error(
            'Nellobytes credentials are not set. ' +
            'Please set NELLOBYTES_USERID/NELLOBYTES_APIKEY or CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in your environment'
        );
    }

    // Add required parameters
    const fullParams = {
        ...params,
        UserID: USERID,
        APIKey: APIKEY,
        CallBackURL: CALLBACK
    };

    // Add callback URL if provided
    if (CALLBACK) {
        fullParams.CallBackURL = CALLBACK;
    }

    const url = `${BASE_URL}/${path}?${buildQuery(fullParams)}`;

    try {
        console.log(`Calling Nellobytes API: ${path}`);
        
        const response = await axios.get(url, { timeout: 15000 });
        
        // Parse the response based on its format
        return parseNellobytesResponse(response.data);
        
    } catch (error: any) {
        console.error(`Nellobytes API error (${path}):`, error.message);
        
        if (error.response) {
            // API returned an error status code
            throw new Error(`Nellobytes API error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            // No response received
            throw new Error('No response from Nellobytes API - check your internet connection');
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
    if (typeof data === 'string') {
        // Handle query string format: "orderid=123&statuscode=100&status=ORDER_RECEIVED"
        try {
            const params = new URLSearchParams(data);
            return {
                orderid: params.get('orderid') || undefined,
                statuscode: params.get('statuscode') || '500',
                status: params.get('status') || 'UNKNOWN_ERROR',
                requestid: params.get('requestid') || undefined,
                transid: params.get('transid') || undefined
            };
        } catch (error) {
            throw new Error(`Failed to parse Nellobytes response: ${data}`);
        }
    }
    
    // If response is already JSON
    if (typeof data === 'object' && data !== null) {
        return {
            orderid: data.orderid,
            statuscode: data.statuscode?.toString() || '500',
            status: data.status || 'UNKNOWN_ERROR',
            requestid: data.requestid,
            transid: data.transid
        };
    }
    
    throw new Error(`Unexpected response format from Nellobytes: ${typeof data}`);
}

/**
 * Convert our network name to Nellobytes code
 */
export function convertNetworkToCode(network: string): MobileNetworkCode {
    const codeMap: { [key: string]: MobileNetworkCode } = {
        'mtn': MobileNetworkCode.MTN,
        'glo': MobileNetworkCode.GLO,
        'airtel': MobileNetworkCode.AIRTEL,
        'etisalat': MobileNetworkCode.ETISALAT,
        '9mobile': MobileNetworkCode.ETISALAT // Alias for etisalat
    };

    const code = codeMap[network.toLowerCase()];
    if (!code) {
        throw new Error(`Unsupported mobile network: ${network}. Supported: mtn, glo, airtel, etisalat`);
    }

    return code;
}

/**
 * Check if a Nellobytes response indicates success
 */
export function isSuccessfulResponse(response: NellobytesResponse): boolean {
    // Status code 100 typically means success
    return response.statuscode === '100';
}

export default {
    /**
     * Buy airtime
     * @param params - Airtime purchase parameters
     * @returns Nellobytes API response
     */
    async buyAirtime(params: AirtimePurchaseParams): Promise<NellobytesResponse> {
        const nellobytesParams = {
            MobileNetwork: params.mobileNetwork,
            Amount: params.amount.toString(),
            MobileNumber: params.mobileNumber,
            ...(params.requestId && { RequestID: params.requestId }),
            ...(params.bonusType && { BonusType: params.bonusType })
        };

        return callApi('APIAirtimeV1.asp', nellobytesParams);
    },

    /**
     * Buy data bundle
     * @param params - Data bundle purchase parameters  
     * @returns Nellobytes API response
     */
    async buyDatabundle(params: {
        mobileNetwork: MobileNetworkCode;
        dataPlan: string;
        mobileNumber: string;
        requestId?: string;
    }): Promise<NellobytesResponse> {
        const nellobytesParams = {
            MobileNetwork: params.mobileNetwork,
            DataPlan: params.dataPlan,
            MobileNumber: params.mobileNumber,
            ...(params.requestId && { RequestID: params.requestId })
        };

        return callApi('APIDatabundleV1.asp', nellobytesParams);
    },

    /**
     * Query transaction status by RequestID or OrderID
     */
    async queryStatus(requestId?: string, orderId?: string): Promise<NellobytesResponse> {
        if (!requestId && !orderId) {
            throw new Error('Either requestId or orderId must be provided');
        }

        const params: any = {};
        if (requestId) params.RequestID = requestId;
        if (orderId) params.OrderID = orderId;

        return callApi('APIQueryV1.asp', params);
    },

    /**
     * Cancel transaction by RequestID
     */
    async cancelTransaction(requestId: string): Promise<NellobytesResponse> {
        return callApi('APICancelV1.asp', { RequestID: requestId });
    },

    /**
     * Utility function to purchase airtime using network name instead of code
     */
    async purchaseAirtimeSimple(network: string, amount: number, phoneNumber: string, requestId?: string) {
        const networkCode = convertNetworkToCode(network);
        return this.buyAirtime({
            mobileNetwork: networkCode,
            amount,
            mobileNumber: phoneNumber,
            requestId
        });
    },

    // Export helper functions for use in other services
    helpers: {
        convertNetworkToCode,
        isSuccessfulResponse,
        parseNellobytesResponse
    }
};