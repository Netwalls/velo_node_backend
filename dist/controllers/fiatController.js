"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiatController = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class FiatController {
    /**
     * Initiate a Fincra pay-in (deposit) for a user.
     * Replace endpoint paths/fields with the exact ones from Fincra docs.
     */
    static async initiateFincraDeposit(req, res) {
        const { amount, email, callbackUrl } = req.body; // amount in NGN (number)
        if (!amount || !email)
            return res.status(400).json({ error: 'amount and email required' });
        try {
            const payload = {
                amount: Math.round(amount * 100), // if API expects kobo
                currency: 'NGN',
                customer_email: email,
                callback_url: callbackUrl || process.env.FINCRA_CALLBACK_URL,
                // add any required fields: provider (bank), account_reference, etc.
            };
            const response = await axios_1.default.post(`${process.env.FINCRA_BASE_URL}/payins`, // replace with correct path
            payload, {
                headers: {
                    Authorization: `Bearer ${process.env.FINCRA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            // Inspect provider response to extract payment_url or reference
            return res.json({ data: response.data });
        }
        catch (err) {
            console.error('Fincra deposit init error', err);
            return res
                .status(500)
                .json({ error: 'Failed to initiate deposit' });
        }
    }
    /**
     * Webhook endpoint for Fincra events (payin / payout status).
     * Configure your Fincra webhook URL to point here.
     */
    static async fincraWebhook(req, res) {
        try {
            const signatureHeader = req.headers['x-fincra-signature']; // replace header name if different
            const rawBody = JSON.stringify(req.body); // express must not have parsed/modified body for exact verification
            const secret = process.env.FINCRA_WEBHOOK_SECRET || '';
            if (secret && signatureHeader) {
                const computed = crypto_1.default
                    .createHmac('sha256', secret)
                    .update(rawBody)
                    .digest('hex');
                if (computed !== signatureHeader) {
                    console.warn('Invalid fincra webhook signature');
                    return res.status(400).send('invalid signature');
                }
            }
            const event = req.body;
            // Example handling:
            // if (event.type === 'payin.success') { credit user; }
            // if (event.type === 'payin.failed') { mark failed; }
            // if (event.type === 'transfer.success') { mark withdrawal completed; }
            // Map event.data to your internal users/addresses, update balances, log transactions
            console.log('Fincra webhook received', event.type || event);
            res.sendStatus(200);
        }
        catch (error) {
            console.error('Fincra webhook error', error);
            res.sendStatus(500);
        }
    }
    /**
     * Initiate a withdrawal (payout) via Fincra:
     * - create beneficiary (bank account) if required
     * - create transfer to beneficiary
     */
    static async initiateFincraWithdrawal(req, res) {
        const { userId, amountNgN, account } = req.body;
        // account: { bank_code, account_number, name } or beneficiary id depending on Fincra API
        if (!userId || !amountNgN || !account)
            return res.status(400).json({ error: 'missing params' });
        try {
            // 1) Optionally create beneficiary
            const beneficiaryPayload = {
                type: 'bank_account', // placeholder
                name: account.name,
                account_number: account.account_number,
                bank_code: account.bank_code,
                currency: 'NGN',
            };
            const beneficiaryResp = await axios_1.default.post(`${process.env.FINCRA_BASE_URL}/beneficiaries`, // replace with accurate path
            beneficiaryPayload, {
                headers: {
                    Authorization: `Bearer ${process.env.FINCRA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            const beneficiaryId = beneficiaryResp.data?.data?.id || beneficiaryResp.data?.id;
            // 2) Create transfer/payout
            const transferPayload = {
                beneficiary_id: beneficiaryId,
                amount: Math.round(amountNgN * 100), // if API expects kobo
                currency: 'NGN',
                reference: `withdraw_${userId}_${Date.now()}`,
                // metadata: { userId }
            };
            const transferResp = await axios_1.default.post(`${process.env.FINCRA_BASE_URL}/transfers`, // replace with correct path
            transferPayload, {
                headers: {
                    Authorization: `Bearer ${process.env.FINCRA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            // Persist transfer reference/status in DB mapped to user and debit internal wallet now or on success depending on your rules
            return res.json({ data: transferResp.data });
        }
        catch (err) {
            let errorMsg = '';
            if (err && typeof err === 'object') {
                if ('response' in err &&
                    err.response &&
                    typeof err.response === 'object' &&
                    'data' in err.response) {
                    // @ts-ignore
                    errorMsg = err.response.data;
                }
                else if ('message' in err &&
                    typeof err.message === 'string') {
                    // @ts-ignore
                    errorMsg = err.message;
                }
                else {
                    errorMsg = JSON.stringify(err);
                }
            }
            else {
                errorMsg = String(err);
            }
            console.error('Fincra withdrawal error', errorMsg);
            return res
                .status(500)
                .json({ error: 'Failed to initiate withdrawal' });
        }
    }
    /**
     * Verify a bank account / mobile money / IBAN via Fincra.
     * Expects request body to include `type` and the relevant fields:
     * - bank_account / nuban: { accountNumber, bankCode, currency? }
     * - mobile_money: { accountNumber, mobileMoneyCode, currency? }
     * - iban: { iban }
     */
    static async verifyFincraBankAccount(req, res) {
        const body = req.body || {};
        const type = (body.type || '').toString();
        if (!type) {
            return res.status(400).json({
                error: 'type is required (bank_account | mobile_money | iban | nuban)',
            });
        }
        // Normalize input keys (accept snake_case or camelCase)
        const accountNumber = body.accountNumber || body.account_number;
        const bankCode = body.bankCode || body.bank_code;
        const mobileMoneyCode = body.mobileMoneyCode || body.mobile_money_code;
        const iban = body.iban;
        const currency = body.currency || 'NGN';
        // Build payload according to Fincra docs
        let payload = { type };
        if (type === 'bank_account' || type === 'nuban') {
            if (!accountNumber || !bankCode) {
                return res.status(400).json({
                    error: 'accountNumber and bankCode are required for bank_account / nuban',
                });
            }
            payload.accountNumber = accountNumber
                .toString()
                .replace(/\s+/g, '');
            payload.bankCode = bankCode.toString();
            payload.currency = currency;
        }
        else if (type === 'mobile_money') {
            if (!accountNumber || !mobileMoneyCode) {
                return res.status(400).json({
                    error: 'accountNumber and mobileMoneyCode are required for mobile_money',
                });
            }
            payload.accountNumber = accountNumber
                .toString()
                .replace(/\s+/g, '');
            payload.mobileMoneyCode = mobileMoneyCode.toString();
            payload.currency = currency;
        }
        else if (type === 'iban') {
            if (!iban) {
                return res
                    .status(400)
                    .json({ error: 'iban is required for type=iban' });
            }
            payload.iban = iban.toString().replace(/\s+/g, '');
        }
        else {
            return res.status(400).json({
                error: 'unsupported type. Use bank_account | mobile_money | iban | nuban',
            });
        }
        try {
            const url = `${process.env.FINCRA_BASE_URL?.replace(/\/+$/, '') || ''}/core/accounts/resolve`;
            const response = await axios_1.default.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${process.env.FINCRA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            const data = response.data || {};
            // Normalize provider response to a stable shape
            const normalized = {
                success: !!data?.success,
                message: data.message || null,
                data: {
                    account_name: data?.data?.accountName ||
                        data?.data?.account_name ||
                        data?.accountName ||
                        data?.account_name ||
                        null,
                    account_number: data?.data?.accountNumber ||
                        data?.data?.account_number ||
                        data?.accountNumber ||
                        data?.account_number ||
                        accountNumber ||
                        null,
                    bank_code: data?.data?.bankCode ||
                        data?.data?.bank_code ||
                        data?.bankCode ||
                        data?.bank_code ||
                        bankCode ||
                        null,
                    iban: data?.data?.iban || null,
                    raw: data,
                },
            };
            return res.json(normalized);
        }
        catch (err) {
            // simplified: do not rely on axios.isAxiosError
            let errorMsg = 'Failed to verify account';
            const status = err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response?.status
                ? err.response.status
                : undefined;
            const respData = err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response?.data
                ? err.response.data
                : undefined;
            if (respData) {
                errorMsg = respData?.message || JSON.stringify(respData);
                console.error('Bank verification error', errorMsg);
                return res
                    .status(status || 500)
                    .json({ error: errorMsg, details: respData });
            }
            if (err instanceof Error)
                errorMsg = err.message;
            else
                errorMsg = String(err);
            console.error('Bank verification error', errorMsg);
            return res.status(status || 500).json({ error: errorMsg });
        }
    }
}
exports.FiatController = FiatController;
//# sourceMappingURL=fiatController.js.map