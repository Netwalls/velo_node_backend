// test-keys.js
require('dotenv').config();

const privateKeyBase64 = process.env.CHANGELLY_API_SECRET;
const publicKey = process.env.CHANGELLY_API_KEY;

if (!privateKeyBase64) {
    console.error('❌ CHANGELLY_API_SECRET not found in environment');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('CHANGELLY')));
    process.exit(1);
}

console.log('Public Key:', publicKey);
console.log('\n--- Decoding Private Key ---');

const decoded = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');

console.log('\nDecoded private key:');
console.log(decoded);
console.log('\n--- Key Validation ---');
console.log('Length:', decoded.length);
console.log('Has BEGIN PRIVATE KEY:', decoded.includes('-----BEGIN PRIVATE KEY-----'));
console.log('Has END PRIVATE KEY:', decoded.includes('-----END PRIVATE KEY-----'));
console.log('Line count:', decoded.split('\n').length);
console.log('First line:', decoded.split('\n')[0]);
console.log('Last line:', decoded.split('\n').slice(-1)[0]);