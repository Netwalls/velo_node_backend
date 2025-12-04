import { ChangellyFiatClient } from '@changelly/fiat-api-sdk-node';

export class FiatService {
  private client: ChangellyFiatClient;

  constructor() {
    this.client = new ChangellyFiatClient({
      privateKey: process.env.CHANGELLY_FIAT_PRIVATE_KEY || '',
      publicKey: process.env.CHANGELLY_FIAT_PUBLIC_KEY || '',
    });
  }

  getProvivers() {
    return this.client.getProviderList();
  }


}
