"use strict";
// // src/test-currencies.ts
// import dotenv from 'dotenv';
// dotenv.config();
// import ChangellyService from './services/changellyService_impl';
// (async () => {
//   try {
//     console.log('Testing /v1/currencies...');
//     // All fiats
//     const fiats = await ChangellyService.getCurrencies('fiat');
//     console.log('Supported Fiats (NGN check):', fiats.some((c: any) => c.ticker === 'NGN') ? 'NGN ✅' : 'NGN ❌');
//     console.log('All Fiats:', fiats.map((c: any) => c.ticker).slice(0, 5));  // First 5
//     // All cryptos
//     const cryptos = await ChangellyService.getCurrencies('crypto');
//     console.log('Supported Cryptos (BTC/USDT check):', {
//       BTC: cryptos.some((c: any) => c.ticker === 'BTC') ? '✅' : '❌',
//       USDT: cryptos.some((c: any) => c.ticker === 'USDT') ? '✅' : '❌'
//     });
//     console.log('All Cryptos (first 5):', cryptos.map((c: any) => c.ticker).slice(0, 5));
//     // MoonPay fiats
//     const moonpayFiats = await ChangellyService.getCurrencies('fiat', 'moonpay');
//     console.log('MoonPay Fiats (NGN check):', moonpayFiats.some((c: any) => c.ticker === 'NGN') ? 'NGN ✅' : 'NGN ❌');
//     // MoonPay cryptos
//     const moonpayCryptos = await ChangellyService.getCurrencies('crypto', 'moonpay');
//     console.log('MoonPay Cryptos (BTC/USDT):', {
//       BTC: moonpayCryptos.some((c: any) => c.ticker === 'BTC') ? '✅' : '❌',
//       USDT: moonpayCryptos.some((c: any) => c.ticker === 'USDT') ? '✅' : '❌'
//     });
//   } catch (err: any) {
//     console.error('Currencies Error:', err.message);
//     console.error('Details:', err.errorDetails || 'Check params/signature');
//   }
// })();
//# sourceMappingURL=test-currencies.js.map