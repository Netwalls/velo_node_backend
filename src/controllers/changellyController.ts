// src/controllers/changelly.controller.ts
import { Router } from 'express';
import { createPrivateKey, sign } from 'crypto';

const router = Router();

// ===================================================================
// CONFIG – Put these in .env in production!
// ===================================================================
const API_PUBLIC_KEY = "1fc5ebda92bce8350b973f6718f99aeb871319f2f21fd2d90a6cc12b382883ea";
const API_PRIVATE_KEY_PEM = "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2d0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktrd2dnU2xBZ0VBQW9JQkFRRGlWRi9hTEY0ZWpPM0IKMHJxTk9tOStKTEFGZU9LYTUyby85ZkE3TFNXV2JBSkNncnVoVWhoQ3VCbmpaMXlEOWtVdjd6TFRDK0puandnQgp4Yi9YK2JxUUJzaEo3SXhObHhjZEhVOEVSOXJpcTQ1SEFJYnR6RXllRkViYndmdVB2emIveG5LY1ZSSndJODkyClIrNUJESEtvTmgxbTVGaHUwTFZ1c01TeXZNVlVHTlEzQUdtQVBQeERyTC9ML2hVQVJaTjZLYlhGYTBpY2F3cG8KVEJVbjBCQ2IwZUJ6OHdZaVZxam9wQmdvb0plSTlWT3hUMGN3OXUwb1htL0VKS3djQTBxN2ZFcWxTNENhRXcwTApqcDQ0L3JqZmF3NjJWNUpZZTFiZU9UTjJYQjhGVHhBcWk2cFJpbWZOQ1hJajJqZFNIUEh4Vzh6UmQvMTViZk0wCjNIWFNWV0t0QWdNQkFBRUNnZ0VBQlQ2aDlLaFA0TEt3cW12UkJESWZ5MGlHVzY5d0c0UXBUaVRMZ0ZPTTFNT0QKK2VQcS9TaXQyZWljNWt3Z05MUDI2U1FkMnJqTkhQYVBpa1drS3hrUHN3UUtqWGFuSkZVbFQvaThrQU4vbGFrVwp1WnZRTDBxQXJBUEVSZXRrMTV2b0VRZnU0cU13czRYZzZpNFlpS0ZyakNpcU14YmFNR3lJWFJ4STNVREtseWJyCnBQZHhZUWpUNWlnQmp4bVVvVjZlUjJiUFNWMXlkV08yMG1jNnpGRUJCV2R6VWY0Y1F2eFM0andRb0JGQXdHSmwKYlhuSll5dE8rUHlUUTgwSXNuamN4eVhZUVpJMDR1YXkxZW5yb1dERVdlQ0JBVk1WMldhR1J3Vk8zdHR3UFNZdgpuMExEY2pVSU5GK0RTcE9BaVJwNTBENzIxRnBxRjVMTHB3MzlncC9VOFFLQmdRRG9VSUNTSEhGdEF6STVxRTdICldNcG14aTZvMG45OUx6aVFqMFkzVWQ3bk1YL25iTHIvWUhJTFlsU0pUYTY1cDBESzhuWmI2ZGsyMVdZTnFrenUKajdibjFDNXlDN2l2QmhqUWlHdXkvZjJPdlJUQy9KVHJoYXBreUR6TkpiODIrVmNzN1Z1RDREdzBsdzNTTVg5Twp3c2tNU0UrazIwQTRLaXZKKzNKdnlWa3M1d0tCZ1FENVo2b21iS05sS3lSOVRMeGlna3hDWTQ3d0puM3EzVFhQCnpGQzd2N2xyd3o2L0JhRU80NElVcWpsL3hpelhGbkZBSzRuRlczT29rR2ZTTVNyUkwyOVpyOHZQdFVEUktxSzgKdndUOWpkK2IzYVJBTGZIOWY1ZXZ2eE1CbUY4R2c4NHRZK1RaYVZ1NmdPQUpPeWZRTHhLc3lZR2l5NGRmWWphYQpvK1hGTTNhTlN3S0JnUURQVFc2OWN4WWdFZGNTcmtiR0NreHFrM1IxZjRqMk8xbjlYV3hwMXV2U1lGQmpRWnBJCllsYkNJOWVOd2owbE84Tk1sam5aNFAzTXVYWmN3VmZ2RlYxQTJBMHVCWm1pelF6OW9JNkNaYldLVnQyYzlXa3EKRmRlc0lTWm9aY09RbWNVWnVTQ051RjNoQzkzd2Irekxhbk9mT3pPZXgyc3g4eWVxRUcvWW90S3Bod0tCZ1FDWApQSnA4TkhLY3ZaMmg4YTltMlBaZlo3bmN2S3FzaWpuQWFYZ25jYXFCdzJMQU9TeWlONm5BMkR5SDArZUxBa3ZvCmlyNC9sQ1k5ZUZ2TXBRMyt6WkhyUStRR2J6WC80S2ZRWnRFaTVDNU5lUWpKOWxLQTB5ZHJaaVdqV1A5K2x0eW0KdjZXZGhQc2Z6RmlPb0hXVEU0aHlpTHI0dWd5NzlYV0JMcFA5a2loNG93S0JnUUNXb1VxWVY1ZG02MmRTc0JwMwpqalFwdXorZ0lmb3Bwa25vSUhGUmpXMXdYeTZrd3AyUk5xenplVS9TWDNpRWlXUTM2MTBmYXZxV1NWdEttTFBDClVwb2N1cEtTZUpzekM1K3pZaHB4QWZ2T080QWY1Y2xEZXk3aGt6TlVIMUpGSjZ1anI3SHpieFFUU1c2ZkhnOXgKelJBaEMyUjgwdjVRaUJHRnA1UHpEalZ3K3c9PQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg"

const privateKey = createPrivateKey({
  key: API_PRIVATE_KEY_PEM,
  type: 'pkcs1',
  format: 'pem',
  encoding: 'base64',
});

const BASE_URL = 'https://fiat-api.changelly.com';

// Helper: Generate signature exactly like your working script
const generateSignature = (payload: string): string => {
  return sign('sha256', Buffer.from(payload), privateKey).toString('base64');
};

// ===================================================================
// GET /api/fiat/changelly/offers
// ===================================================================
router.get('/offers', async (req, res) => {
  const {
    currencyFrom,
    currencyTo,
    amountFrom,
    country,
    providerCode,
    externalUserId,
    state,
    ip,
  } = req.query;

  // Required params
  if (!currencyFrom || !currencyTo || !amountFrom || !country) {
    return res.status(400).json({
      error: 'Missing required query params: currencyFrom, currencyTo, amountFrom, country',
    });
  }

  const queryParams = new URLSearchParams({
    currencyFrom: String(currencyFrom).toUpperCase(),
    currencyTo: String(currencyTo).toUpperCase(),
    amountFrom: String(amountFrom),
    country: String(country).toUpperCase(),
    ...(providerCode && { providerCode: String(providerCode) }),
    ...(externalUserId && { externalUserId: String(externalUserId) }),
    ...(state && { state: String(state) }),
    ...(ip && { ip: String(ip) }),
  });

  const path = `/v1/offers?${queryParams.toString()}`;
  const fullUrl = BASE_URL + path;

  try {
    const signature = generateSignature(fullUrl); // GET → sign full URL

    const apiRes = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_PUBLIC_KEY,
        'X-Api-Signature': signature,
        'Content-Type': 'application/json',
      },
    });

    const text = await apiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Changelly API error', details: data });
    }

    return res.json(data.result || data);
  } catch (err: any) {
    console.error('Changelly offers error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ===================================================================
// POST /api/fiat/changelly/orders
// ===================================================================
router.post('/orders', async (req, res) => {
  const body = req.body;

  const required = [
    'externalOrderId',
    'externalUserId',
    'providerCode',
    'currencyFrom',
    'currencyTo',
    'amountFrom',
    'country',
    'walletAddress',
  ];

  const missing = required.filter((field) => !body[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing,
    });
  }

  const path = '/v1/orders';
  const fullUrl = BASE_URL + path;
  const jsonBody = JSON.stringify({
    ...body,
    currencyFrom: body.currencyFrom.toUpperCase(),
    currencyTo: body.currencyTo.toUpperCase(),
    country: body.country.toUpperCase(),
  });

  try {
    const payloadToSign = fullUrl + jsonBody; // POST → full URL + JSON body
    const signature = generateSignature(payloadToSign);

    const apiRes = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_PUBLIC_KEY,
        'X-Api-Signature': signature,
        'Content-Type': 'application/json',
      },
      body: jsonBody,
    });

    const text = await apiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Changelly create order failed', details: data });
    }

    const result = data.result || data;
    return res.status(201).json(result);
  } catch (err: any) {
    console.error('Changelly create order error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

export default router;