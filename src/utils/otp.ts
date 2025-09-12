import crypto from 'crypto';

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const isOTPExpired = (expiry: Date): boolean => {
  return new Date() > expiry;
};

export const getOTPExpiry = (): Date => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};
