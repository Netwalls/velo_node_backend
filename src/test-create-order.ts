// // src/test-final.ts
// import dotenv from 'dotenv';
// dotenv.config();
// import ChangellyService from './services/changellyService_impl';

// (async () => {
//   try {
//     console.log('Testing key...');
//     const sig = ChangellyService['createSignature']('/v1/offers', { test: true });
//     console.log('Key OK:', sig.substring(0, 20) + '...');

//     const offersQuery = {
//       currencyFrom: 'NGN',
//       currencyTo: 'BTC',
//       amountFrom: '100000',
//       country: 'NG',
//     };
//     console.log('REQUEST getOffers body:', offersQuery);
//     const offers = await ChangellyService.getOffers(offersQuery);

//     console.log('OFFERS:', offers.map(o => ({
//       provider: o.providerCode,
//       youGet: o.amountExpectedTo
//     })));

//     const payload = {
//       externalOrderId: `test_${Date.now()}`,
//       externalUserId: 'user_1',
//       providerCode: 'moonpay',  // ← Force MoonPay
//       currencyFrom: 'NGN',
//       currencyTo: 'BTC',
//       amountFrom: '100000',
//       country: 'NG',
//       walletAddress: '1E8u1twuUAguj2qrVAfxBjYeT886Rq9ryN', // ← BTC address
//       returnSuccessUrl: 'https://connectvelo.com/success',
//       returnFailedUrl: 'https://connectvelo.com/failed',
//     };

//     console.log('REQUEST createOrder body:', payload);
//     // Compute signature for the create-order payload so we can print a curl example
//     const apiKey = process.env.CHANGELLY_API_KEY || process.env.CHANGELLY_PUBLIC_KEY || '<apiKey>';
//     const signature = ChangellyService['createSignature']('/v1/orders', payload);

//     console.log('\n=== CURL EXAMPLE ===');
//     // Print curl in a single line (avoids escaping issues). You can split the lines manually if desired.
//     console.log(
//       "curl --location --request POST 'https://fiat-api.changelly.com/v1/orders' " +
//         "--header 'X-Api-Key: " + apiKey + "' " +
//         "--header 'X-Api-Signature: " + signature + "' " +
//         "--data-raw '" + JSON.stringify(payload, null, 2) + "'"
//     );

//     const order = await ChangellyService.createOrder(payload);
//     console.log('MOONPAY ORDER:', order.redirectUrl);
//   } catch (err: any) {
//     console.error('ERROR:', err.message);
//     console.error('Details:', err.errorDetails);
//   }
// })();