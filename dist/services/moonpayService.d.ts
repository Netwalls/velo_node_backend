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
export declare class MoonpayService {
    static createTransaction(payload: any): Promise<{
        ok: boolean;
        status: number;
        data: any;
    }>;
}
export default MoonpayService;
//# sourceMappingURL=moonpayService.d.ts.map