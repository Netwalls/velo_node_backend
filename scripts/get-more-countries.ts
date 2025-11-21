#!/usr/bin/env node
import * as crypto from 'crypto';
import fs from 'fs';
import util from 'util';

// Usage:
// CHANGELLY_PUBLIC_KEY=<your_api_key> CHANGELLY_PRIVATE_KEY=<your_base64_private_key> \
//   node scripts/get-more-countries.ts
// The script signs the canonical payload (full URL + JSON(body)) and calls
// GET /v1/available-countries, then saves the full JSON to available-countries.json
// and prints a compact summary (codes + provider counts).

const BASE = 'https://fiat-api.changelly.com';
const ENDPOINT = '/v1/available-countries';

const PUBLIC_KEY = process.env.CHANGELLY_PUBLIC_KEY || process.env.API_PUBLIC_KEY;
const PRIVATE_KEY_RAW = process.env.CHANGELLY_PRIVATE_KEY || process.env.API_PRIVATE_KEY;

if (!PUBLIC_KEY || !PRIVATE_KEY_RAW) {
  console.error('Missing keys. Set CHANGELLY_PUBLIC_KEY and CHANGELLY_PRIVATE_KEY (base64) in the environment.');
  process.exit(1);
}

// Narrowed non-null local copies so TypeScript knows they exist
const PUB = PUBLIC_KEY as string;
const PRIV_RAW = PRIVATE_KEY_RAW as string;

function getPrivateKey() {
  try {
    return crypto.createPrivateKey({
      key: PRIV_RAW.trim(),
      type: 'pkcs1',
      format: 'pem',
      encoding: 'base64',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to parse private key. Ensure you pasted the raw base64-encoded PEM body (no headers).', msg);
    process.exit(2);
  }
}

function createSignature(fullUrl: string, body: any, keyObj: crypto.KeyObject) {
  const payload = `${fullUrl}` + JSON.stringify(body);
  return crypto.sign('sha256', Buffer.from(payload), keyObj).toString('base64');
}

async function main() {
  const key = getPrivateKey();
  const fullUrl = `${BASE}${ENDPOINT}`;
  const sig = createSignature(fullUrl, {}, key);

  console.log('[INFO] GET', fullUrl);
  console.log('[INFO] X-Api-Key preview:', PUB.slice(0, 8) + '...');
  console.log('[INFO] X-Api-Signature preview:', sig.slice(0, 12));

  const res = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'X-Api-Key': PUB,
      'X-Api-Signature': sig,
      'Content-Type': 'application/json',
    } as Record<string, string>,
  });

  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch (e) { /* leave as text */ }

  console.log('[HTTP]', res.status, res.statusText);
  if (!res.ok) {
    console.error('API error response body:', data);
    process.exit(3);
  }

  // Save full JSON for inspection
  const outFile = 'available-countries.json';
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log('[INFO] Wrote', outFile);

  if (!Array.isArray(data)) {
    console.log('[WARN] Unexpected response shape (not an array). Dumping with util.inspect');
    console.log(util.inspect(data, { depth: null, maxArrayLength: null }));
    return;
  }

  // Print compact summary: code, name, providerCount for first N countries and total count
  console.log('\nSummary (first 60 countries):');
  const N = 60;
  data.slice(0, N).forEach((c: any, i: number) => {
    const code = c.code || c.countryCode || '??';
    const name = c.name || c.country || 'unknown';
    const providers = Array.isArray(c.providers) ? c.providers.length : 0;
    console.log(`${String(i+1).padStart(3)}. ${code} — ${name} (providers: ${providers})`);
  });
  console.log('\nTotal countries returned:', data.length);

  // Print only the codes as a comma separated list (helpful for quick copy)
  const codes = data.map((c: any) => c.code || c.countryCode).filter(Boolean);
  console.log('\nCountry codes (all):');
  console.log(codes.join(', '));
}

main().catch(err => { console.error('Fatal:', err); process.exit(99); });
