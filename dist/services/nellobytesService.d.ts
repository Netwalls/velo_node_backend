declare const _default: {
    /**
     * Buy airtime
     * params: { MobileNetwork, Amount, MobileNumber, RequestID }
     */
    buyAirtime(params: {
        MobileNetwork: string;
        Amount: number | string;
        MobileNumber: string;
        RequestID?: string;
    }): Promise<unknown>;
    /**
     * Buy databundle
     * params: { MobileNetwork, DataPlan, MobileNumber, RequestID }
     */
    buyDatabundle(params: {
        MobileNetwork: string;
        DataPlan: string;
        MobileNumber: string;
        RequestID?: string;
    }): Promise<unknown>;
    /**
     * Buy cable tv subscription
     * params vary but typically include DecoderID, Network, Bouquet, Amount, RequestID
     */
    buyCable(params: Record<string, any>): Promise<unknown>;
    /**
     * Query transaction status by RequestID
     */
    queryStatus(requestId: string): Promise<unknown>;
    /**
     * Cancel transaction by RequestID
     */
    cancel(requestId: string): Promise<unknown>;
};
export default _default;
//# sourceMappingURL=nellobytesService.d.ts.map