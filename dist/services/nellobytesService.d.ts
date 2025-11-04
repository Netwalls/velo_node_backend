export declare enum MobileNetworkCode {
    MTN = "01",
    GLO = "02",
    ETISALAT = "03",
    AIRTEL = "04"
}
export interface NellobytesResponse {
    orderid?: string;
    statuscode: string;
    status: string;
    requestid?: string;
    transid?: string;
    meterno?: string;
    metertoken?: string;
}
export interface NellobytesDataPlan {
    dataplan_id: string;
    plan_network: string;
    plan_name: string;
    plan_amount: string;
    month_validate: string;
}
export interface NellobytesElectricCompany {
    company_id: string;
    company_name: string;
    prepaid_available: boolean;
    postpaid_available: boolean;
    min_amount: number;
    max_amount: number;
}
export interface AirtimePurchaseParams {
    mobileNetwork: MobileNetworkCode;
    amount: number;
    mobileNumber: string;
    requestId?: string;
    bonusType?: string;
}
export interface DataBundlePurchaseParams {
    mobileNetwork: MobileNetworkCode;
    dataPlan: string;
    mobileNumber: string;
    requestId?: string;
}
export interface ElectricityPurchaseParams {
    electricCompany: string;
    meterType: string;
    meterNo: string;
    phoneNo: string;
    amount: number;
    requestId?: string;
}
/**
 * Parse Nellobytes API response which can be in different formats
 */
declare function parseNellobytesResponse(data: any): NellobytesResponse;
/**
 * Convert our network name to Nellobytes code
 */
export declare function convertNetworkToCode(network: string): MobileNetworkCode;
/**
 * Check if a Nellobytes response indicates success
 */
export declare function isSuccessfulResponse(response: NellobytesResponse): boolean;
/**
 * Map Nellobytes status codes to user-friendly messages
 */
export declare function getStatusMessage(response: NellobytesResponse): string;
/**
 * Parse price string from Nellobytes (e.g., "N2,325.00" to 2325.00)
 */
export declare function parsePriceString(priceStr: string): number;
export declare class NellobytesService {
    /**
     * Buy airtime
     * @param params - Airtime purchase parameters
     * @returns Nellobytes API response
     */
    buyAirtime(params: AirtimePurchaseParams): Promise<NellobytesResponse>;
    /**
     * Buy data bundle
     * @param params - Data bundle purchase parameters
     * @returns Nellobytes API response
     */
    buyDatabundle(params: DataBundlePurchaseParams): Promise<NellobytesResponse>;
    /**
     * Buy electricity
     * @param params - Electricity purchase parameters
     * @returns Nellobytes API response
     */
    buyElectricity(params: ElectricityPurchaseParams): Promise<NellobytesResponse>;
    /**
     * Verify electricity meter number
     * @param electricCompany - Company code (01-12)
     * @param meterNo - Meter number to verify
     * @returns Nellobytes API response
     */
    verifyElectricityMeter(electricCompany: string, meterNo: string): Promise<NellobytesResponse>;
    /**
     * Fetch electricity companies and their details from Nellobytes API
     * @returns Array of electricity companies
     */
    fetchElectricityCompanies(): Promise<NellobytesElectricCompany[]>;
    /**
     * Parse the complex ELECTRIC_COMPANY structure from Nellobytes API
     */
    private parseElectricCompanyData;
    /**
     * Fetch available data plans from Nellobytes API
     * @param network - Network code or name
     * @returns Array of data plans
     */
    fetchDataPlans(network?: string): Promise<NellobytesDataPlan[]>;
    /**
     * Parse the complex MOBILE_NETWORK structure from Nellobytes API
     */
    private parseMobileNetworkData;
    /**
     * Extract validity period from product name
     */
    private extractValidityPeriod;
    /**
     * Query transaction status by RequestID or OrderID
     */
    queryStatus(requestId?: string, orderId?: string): Promise<NellobytesResponse>;
    /**
     * Cancel transaction by RequestID
     */
    cancelTransaction(requestId: string): Promise<NellobytesResponse>;
    /**
     * Utility function to purchase airtime using network name instead of code
     */
    purchaseAirtimeSimple(network: string, amount: number, phoneNumber: string, requestId?: string): Promise<NellobytesResponse>;
    /**
     * Utility function to purchase data bundle using network name and dataplan_id
     */
    purchaseDataBundle(network: string, dataplanId: string, phoneNumber: string, requestId?: string): Promise<NellobytesResponse>;
    /**
     * Utility function to purchase electricity
     */
    purchaseElectricity(electricCompany: string, meterType: string, meterNo: string, phoneNo: string, amount: number, requestId?: string): Promise<NellobytesResponse>;
    /**
     * Check API balance (if supported by Nellobytes)
     */
    checkBalance(): Promise<any>;
    helpers: {
        convertNetworkToCode: typeof convertNetworkToCode;
        isSuccessfulResponse: typeof isSuccessfulResponse;
        parseNellobytesResponse: typeof parseNellobytesResponse;
        getStatusMessage: typeof getStatusMessage;
        parsePriceString: typeof parsePriceString;
    };
}
declare const nellobytesService: NellobytesService;
export default nellobytesService;
export { NellobytesService as NellobytesServiceClass };
export { convertNetworkToCode as convertNetworkToCodeHelper, isSuccessfulResponse as isSuccessfulResponseHelper, parseNellobytesResponse as parseNellobytesResponseHelper, getStatusMessage as getStatusMessageHelper, parsePriceString as parsePriceStringHelper, };
//# sourceMappingURL=nellobytesService.d.ts.map