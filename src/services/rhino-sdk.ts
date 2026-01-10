import { RhinoSdk } from '@rhino.fi/sdk';

export const rhinoSdk = RhinoSdk({
  apiKey: process.env.RHINO_API_KEY!, // From Rhino Developer Portal
});