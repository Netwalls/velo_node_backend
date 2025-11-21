import * as crypto from 'crypto';
const API_PUBLIC_KEY="1fc5ebda92bce8350b973f6718f99aeb871319f2f21fd2d90a6cc12b382883ea"
const API_PRIVATE_KEY="LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2d0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktrd2dnU2xBZ0VBQW9JQkFRRGlWRi9hTEY0ZWpPM0IKMHJxTk9tOStKTEFGZU9LYTUyby85ZkE3TFNXV2JBSkNncnVoVWhoQ3VCbmpaMXlEOWtVdjd6TFRDK0puandnQgp4Yi9YK2JxUUJzaEo3SXhObHhjZEhVOEVSOXJpcTQ1SEFJYnR6RXllRkViYndmdVB2emIveG5LY1ZSSndJODkyClIrNUJESEtvTmgxbTVGaHUwTFZ1c01TeXZNVlVHTlEzQUdtQVBQeERyTC9ML2hVQVJaTjZLYlhGYTBpY2F3cG8KVEJVbjBCQ2IwZUJ6OHdZaVZxam9wQmdvb0plSTlWT3hUMGN3OXUwb1htL0VKS3djQTBxN2ZFcWxTNENhRXcwTApqcDQ0L3JqZmF3NjJWNUpZZTFiZU9UTjJYQjhGVHhBcWk2cFJpbWZOQ1hJajJqZFNIUEh4Vzh6UmQvMTViZk0wCjNIWFNWV0t0QWdNQkFBRUNnZ0VBQlQ2aDlLaFA0TEt3cW12UkJESWZ5MGlHVzY5d0c0UXBUaVRMZ0ZPTTFNT0QKK2VQcS9TaXQyZWljNWt3Z05MUDI2U1FkMnJqTkhQYVBpa1drS3hrUHN3UUtqWGFuSkZVbFQvaThrQU4vbGFrVwp1WnZRTDBxQXJBUEVSZXRrMTV2b0VRZnU0cU13czRYZzZpNFlpS0ZhakNpcU14YmFNR3lJWFJ4STNVREtseWJyCnBQZHhZUWpUNWlnQmp4bVVvVjZlUjJiUFNWMXlkV08yMG1jNnpGRUJCV2R6VWY0Y1F2eFM0andRb0JGQXdHSmwKYlhuSll5dE8rUHlUUTgwSXNuamN4eVhZUVpJMDR1YXkxZW5yb1dERVdlQ0JBVk1WMldhR1J3Vk8zdHR3UFNZdgpuMExEY2pVSU5GK0RTcE9BaVJwNTBENzIxRnBxRjVMTHB3MzlncC9VOFFLQmdRRG9VSUNTSEhGdEF6STVxRTdICldNcG14aTZvMG45OUx6aVFqMFkzVWQ3bk1YL25iTHIvWUhJTFlsU0pUYTY1cDBESzhuWmI2ZGsyMVdZTnFrenUKajdibjFDNXlDN2l2QmhqUWlHdXkvZjJPdlJUQy9KVHJoYXBreUR6TkpiODIrVmNzN1Z1RDREdzBsdzNTTVg5Twp3c2tNU0UrazIwQTRLaXZKKzNKdnlWa3M1d0tCZ1FENVo2b21iS05sS3lSOVRMeGlna3hDWTQ3d0puM3EzVFhQCnpGQzd2N2xyd3o2L0JhRU80NElVcWpsL3hpelhGbkZBSzRuRlczT29rR2ZTTVNyUkwyOVpyOHZQdFVEUktxSzgKdndUOWpkK2IzYVJBTGZIOWY1ZXZ2eE1CbUY4R2c4NHRZK1RaYVZ1NmdPQUpPeWZRTHhLc3lZR2l5NGRmWWphYQpvK1hGTTNhTlN3S0JnUURQVFc2OWN4WWdFZGNTcmtiR0NreHFrM1IxZjRqMk8xbjlYV3hwMXV2U1lGQmpRWnBJCllsYkNJOWVOd2owbE84Tk1sam5aNFAzTXVYWmN3VmZ2RlYxQTJBMHVCWm1pelF6OW9JNkNaYldLVnQyYzlXa3EKRmRlc0lTWm9aY09RbWNVWnVTQ051RjNoQzkzd2Irekxhbk9mT3pPZXgyc3g4eWVxRUcvWW90S3Bod0tCZ1FDWApQSnA4TkhLY3ZaMmg4YTltMlBaZlo3bmN2S3FzaWpuQWFYZ25jYXFCdzJMQU9TeWlONm5BMkR5SDArZUxBa3ZvCmlyNC9sQ1k5ZUZ2TXBRMyt6WkhyUStRR2J6WC80S2ZRWnRFaTVDNU5lUWpKOWxLQTB5ZHJaaVdqV1A5K2x0eW0KdjZXZGhQc2Z6RmlPb0hXVEU0aHlpTHI0dWd5NzlYV0JMcFA5a2loNG93S0JnUUNXb1VxWVY1ZG02MmRTc0JwMwpqalFwdXorZ0lmb3Bwa25vSUhGUmpXMXdYeTZrd3AyUk5xenplVS9TWDNpRWlXUTM2MTBmYXZxV1NWdEttTFBDClVwb2N1cEtTZUpzekM1K3pZaHB4QWZ2T080QWY1Y2xEZXk3aGt6TlVIMUpGSjZ1anI3SHpieFFUU1c2ZkhnOXgKelJBaEMyUjgwdjVRaUJHRnA1UHpEalZ3K3c9PQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg";


const privateKeyObject = crypto.createPrivateKey({
  key: API_PRIVATE_KEY,
  type: 'pkcs1',
  format: 'pem',
  encoding: 'base64',
});
// const path = 'https://fiat-api.changelly.com/v1/currencies?type=crypto';
// const path = 'https://fiat-api.changelly.com/v1/offers?externalUserId=122hd&currencyFrom=EUR&currencyTo=ETH&amountFrom=150&country=FR';
const path = 'https://fiat-api.changelly.com/v1/available-countries';



const message = {};
// const message = {
//   externalOrderId: `velo_${Date.now()}`,
//   externalUserId: "user123",
//   providerCode: "banxa",                    // ← works everywhere (or remove for auto)
//   currencyFrom: "EUR",
//   currencyTo: "ETH",
//   amountFrom: "150",
//   country: "FR",
//   walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
//   paymentMethod: "card",
//   returnSuccessUrl: "https://connectvelo.com/success",
//   returnFailedUrl: "https://connectvelo.com/failed",
// };
// Canonical payload: full URL + JSON(body) — this is what Changelly expects for signing GET requests
const payload = `${path}` + JSON.stringify(message);
const signature = crypto.sign('sha256', Buffer.from(payload), privateKeyObject).toString('base64');
const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': API_PUBLIC_KEY,
    'X-Api-Signature': signature,
  },
  // body: JSON.stringify(message),
};

fetch(path, options).then(response => {
  if (response.ok) {
    return response.json();
  }
  throw new Error(`Request error: ${response.status} ${response.statusText}`);
}).then((response) => {
  console.log('Successful response: ', response);
}).catch(error => {
  console.error(error);
});

