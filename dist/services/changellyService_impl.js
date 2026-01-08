"use strict";
// // src/changelly.js
// import crypto from "crypto";
// import fetch from "node-fetch";
// import dotenv from "dotenv";
// dotenv.config();
// const API_URL = process.env.CHANGELLY_API_URL;
// const PUBLIC_KEY = process.env.CHANGELLY_PUBLIC_KEY;
// const PRIVATE_KEY_B64 = process.env.CHANGELLY_PRIVATE_KEY;
// const privateKey = crypto.createPrivateKey({
//   key: Buffer.from(PRIVATE_KEY_B64, "base64"),
//   format: "pem",
//   type: "pkcs1",
// });
// async function signedRequest(path, body = null, method = "POST") {
//   const url = `${API_URL}${path}`;
//   const payload = body ? url + JSON.stringify(body) : url; // THIS LINE = 100% success
//   const signature = crypto
//     .sign("sha256", Buffer.from(payload), privateKey)
//     .toString("base64");
//   const res = await fetch(url, {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       "X-Api-Key": PUBLIC_KEY,
//       "X-Api-Signature": signature,
//     },
//     body: body ? JSON.stringify(body) : undefined,
//   });
//   const data = await res.json();
//   if (!res.ok) {
//     throw new Error(`Changelly ${res.status}: ${JSON.stringify(data)}`);
//   }
//   return data;
// }
// // BUY: NGN → Crypto
// export async function createBuyOrder({ userId, amountNgn, crypto, walletAddress }) {
//   const externalOrderId = `buy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
//   const order = await signedRequest("/v1/orders", {
//     externalOrderId,
//     externalUserId: userId,
//     currencyFrom: "NGN",
//     currencyTo: crypto.toUpperCase(),
//     amountFrom: String(amountNgn),
//     walletAddress,
//     country: "NG",
//     paymentMethod: "card",
//     returnSuccessUrl: "https://www.connectvelo.com/wallet",
//     returnFailedUrl: "https://www.connectvelo.com/wallet",
//   });
//   return { redirectUrl: order.redirectUrl || order.paymentUrl, orderId: externalOrderId };
// }
// // SELL: Crypto → NGN
// export async function createSellOrder({ userId, amountCrypto, crypto }) {
//   const externalOrderId = `sell_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
//   const order = await signedRequest("/v1/orders", {
//     externalOrderId,
//     externalUserId: userId,
//     currencyFrom: crypto.toUpperCase(),
//     currencyTo: "NGN",
//     amountFrom: String(amountCrypto),
//     country: "NG",
//     paymentMethod: "bank",
//     returnSuccessUrl: "https://www.connectvelo.com/wallet",
//     returnFailedUrl: "https://www.connectvelo.com/wallet",
//   });
//   return { redirectUrl: order.redirectUrl || order.paymentUrl, orderId: externalOrderId };
// }
// export async function getOrderStatus(orderId) {
//   return signedRequest(`/v1/orders/${orderId}`, null, "GET");
// }
//# sourceMappingURL=changellyService_impl.js.map