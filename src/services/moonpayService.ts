import * as crypto from 'crypto';

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
export class MoonpayService {
  static async createTransaction(payload: any): Promise<{ ok: boolean; status: number; data: any }> {
    const baseUrl = process.env.MOONPAY_BASE_URL || 'https://api.moonpay.io';
    const url = `${baseUrl}/v3/transactions`;

    const apiKey = process.env.MOONPAY_API_KEY;
    const apiSecret = process.env.MOONPAY_API_SECRET;

    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      // MoonPay may expect an Authorization header or an x-api-key header depending on account type.
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['X-API-KEY'] = apiKey;
    }

    if (apiSecret) {
      // Default to HMAC-SHA256 over body as a helpful placeholder. Replace if MoonPay docs specify otherwise.
      try {
        const signature = crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
        headers['X-Signature'] = signature;
      } catch (err) {
        console.warn('Failed to compute MoonPay signature (continuing without signature):', err);
      }
    }

    const resp = await fetch(url, { method: 'POST', headers, body });
    const text = await resp.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch (_) { /* leave as text */ }

    return { ok: resp.ok, status: resp.status, data };
  }
}

export default MoonpayService;
