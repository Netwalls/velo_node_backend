export interface InitPaymentInput {
    customerEmail: string;
    amount: number;
    crypto?: string;
    paymentReference?: string;
    redirectUrl: string;
    paymentDescription?: string;
}
export interface InitPaymentResponseData {
    authorization_url: string;
    access_code: string;
    reference: string;
}
export interface InitPaymentResponse {
    status: boolean;
    message: string;
    data: InitPaymentResponseData;
}
declare const initializeTransaction: (data: InitPaymentInput) => Promise<InitPaymentResponse>;
export default initializeTransaction;
//# sourceMappingURL=paystackService.d.ts.map