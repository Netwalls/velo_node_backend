// test-order-only.ts
// Run with: npx ts-node test-order-only.ts

import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(msg: string, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

async function testOrderCreation() {
    const publicKey = process.env.CHANGELLY_API_KEY || process.env.CHANGELLY_PUBLIC_KEY;
    const privateKeyBase64 = process.env.CHANGELLY_API_SECRET || process.env.CHANGELLY_PRIVATE_KEY;

    if (!publicKey || !privateKeyBase64) {
        log('❌ API keys not found in .env', colors.red);
        return;
    }

    log('\n🔐 Loading API Keys...', colors.cyan);
    log(`Public Key: ${publicKey.substring(0, 50)}...`, colors.blue);

    // Create private key object
    let privateKeyObject: any;
    try {
        privateKeyObject = crypto.createPrivateKey({
            key: privateKeyBase64.trim(),
            type: 'pkcs8',
            format: 'pem',
            encoding: 'base64',
        });
        log('✓ Private key loaded\n', colors.green);
    } catch (error: any) {
        log(`❌ Failed to load private key: ${error.message}`, colors.red);
        return;
    }

    // Test with hardcoded offer data (simulate what you'd get from offers)
    log('📝 Creating Order with Test Data...', colors.cyan);
    log('─'.repeat(60), colors.cyan);

    const orderPayload = {
        externalOrderId: `test_${Date.now()}`,
        externalUserId: `user_${Date.now()}`,
        providerCode: 'moonpay', // Common provider - might work
        currencyFrom: 'NGN',
        currencyTo: 'BTC',
        amountFrom: '50000', // Higher amount
        country: 'NG',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Valid BTC address
        paymentMethod: 'card',
        returnSuccessUrl: 'https://example.com/success',
        returnFailedUrl: 'https://example.com/failed'
    };

    console.log('\nOrder Payload:');
    console.log(JSON.stringify(orderPayload, null, 2));

    const path = 'https://fiat-api.changelly.com/v1/orders';
    const payload = path + JSON.stringify(orderPayload);
    
    log(`\n🔐 Generating Signature...`, colors.cyan);
    console.log('Payload:', payload.substring(0, 150) + '...');
    
    const signature = crypto.sign('sha256', Buffer.from(payload), privateKeyObject).toString('base64');
    console.log('Signature:', signature.substring(0, 50) + '...');

    log(`\n📡 Sending Request to Changelly...`, colors.cyan);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': publicKey,
            'X-Api-Signature': signature,
        },
        body: JSON.stringify(orderPayload)
    };

    try {
        const response = await fetch(path, options);
        const responseText = await response.text();

        console.log('\n📥 Response:');
        console.log('Status:', response.status);
        console.log('Body:', responseText);

        if (response.ok) {
            log('\n✅ SUCCESS! Order created!', colors.green);
            const order = JSON.parse(responseText);
            console.log('\nOrder Details:');
            console.log('  Order ID:', order.orderId);
            console.log('  Status:', order.status);
            console.log('  Redirect URL:', order.redirectUrl);
        } else {
            log('\n❌ FAILED!', colors.red);
            
            if (response.status === 401) {
                log('\n🔍 Diagnosis: Unauthorized (401)', colors.yellow);
                log('Possible causes:', colors.yellow);
                log('  1. API keys are for SANDBOX environment', colors.yellow);
                log('  2. API keys are invalid or expired', colors.yellow);
                log('  3. IP address not whitelisted', colors.yellow);
                log('  4. Wrong API product (not Fiat API)', colors.yellow);
                
                log('\n📋 Action Items:', colors.cyan);
                log('  □ Check Changelly dashboard - are these FIAT API keys?', colors.cyan);
                log('  □ Verify keys are for PRODUCTION (not sandbox)', colors.cyan);
                log('  □ Check if IP whitelist is required', colors.cyan);
                log('  □ Try regenerating the keys', colors.cyan);
            } else if (response.status === 400) {
                log('\n🔍 Diagnosis: Bad Request (400)', colors.yellow);
                log('  This means auth worked, but the request is invalid', colors.yellow);
                
                try {
                    const error = JSON.parse(responseText);
                    console.log('  Error:', error.errorMessage);
                    console.log('  Details:', error.errorDetails);
                } catch (e) {
                    console.log('  Response:', responseText);
                }
            }
        }
    } catch (error: any) {
        log(`\n❌ Request Error: ${error.message}`, colors.red);
    }

    // Additional diagnostic info
    log('\n📊 Diagnostic Information:', colors.cyan);
    log('─'.repeat(60), colors.cyan);
    console.log('API Base URL:', 'https://fiat-api.changelly.com/v1');
    console.log('Endpoint:', '/orders');
    console.log('Method:', 'POST');
    console.log('Public Key Length:', publicKey.length);
    console.log('Signature Algorithm:', 'SHA256 with RSA');
    
    log('\n💡 Next Steps:', colors.yellow);
    log('  1. If you get 401: Check your API keys in Changelly dashboard', colors.yellow);
    log('  2. Make sure you\'re using FIAT API keys (not Exchange API)', colors.yellow);
    log('  3. Verify keys are for production environment', colors.yellow);
    log('  4. Contact Changelly support if issue persists', colors.yellow);
}

testOrderCreation().catch(console.error);