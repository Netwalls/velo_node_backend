import axios from 'axios';

const BASE = 'https://www.nellobytesystems.com';

function getEnv(key: string, fallback = ''): string {
    return process.env[key] || fallback;
}

// Support both legacy CLUB_KONNECT_* env names and newer NELLOBYTES_* names.
// This lets projects that already have CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in their
// .env continue working without changing env files.
const USERID = process.env.NELLOBYTES_USERID || process.env.CLUB_KONNECT_ID || '';
const APIKEY = process.env.NELLOBYTES_APIKEY || process.env.CLUB_KONNECT_APIKEY || '';
const CALLBACK = process.env.NELLOBYTES_CALLBACK_URL || process.env.CLUB_KONNECT_CALLBACK_URL || getEnv('NELLOBYTES_CALLBACK_URL');

function buildQuery(params: Record<string, any>): string {
    const esc = encodeURIComponent;
    return Object.keys(params)
        .map((k) => `${esc(k)}=${esc(params[k])}`)
        .join('&');
}

async function callApi(path: string, params: Record<string, any>) {
    if (!USERID || !APIKEY) {
        throw new Error('Nellobytes credentials are not set. Please set NELLOBYTES_USERID/NELLOBYTES_APIKEY or CLUB_KONNECT_ID/CLUB_KONNECT_APIKEY in your environment');
    }

    const fullParams = Object.assign({}, params, {
        UserID: USERID,
        APIKey: APIKEY,
    });

    if (CALLBACK) {
        fullParams.CallBackURL = CALLBACK;
    }

    const url = `${BASE}/${path}?${buildQuery(fullParams)}`;

    const resp = await axios.get(url, { timeout: 15000 });
    return resp.data;
}

export default {
    /**
     * Buy airtime
     * params: { MobileNetwork, Amount, MobileNumber, RequestID }
     */
    async buyAirtime(params: { MobileNetwork: string; Amount: number | string; MobileNumber: string; RequestID?: string }) {
        return callApi('APIAirtimeV1.asp', params as any);
    },

    /**
     * Buy databundle
     * params: { MobileNetwork, DataPlan, MobileNumber, RequestID }
     */
    async buyDatabundle(params: { MobileNetwork: string; DataPlan: string; MobileNumber: string; RequestID?: string }) {
        return callApi('APIDataBundleV1.asp', params as any);
    },

    /**
     * Buy cable tv subscription
     * params vary but typically include DecoderID, Network, Bouquet, Amount, RequestID
     */
    async buyCable(params: Record<string, any>) {
        return callApi('APICableTVV1.asp', params as any);
    },

    /**
     * Query transaction status by RequestID
     */
    async queryStatus(requestId: string) {
        return callApi('APIQueryV1.asp', { RequestID: requestId });
    },

    /**
     * Cancel transaction by RequestID
     */
    async cancel(requestId: string) {
        return callApi('APICancelV1.asp', { RequestID: requestId });
    },
};
