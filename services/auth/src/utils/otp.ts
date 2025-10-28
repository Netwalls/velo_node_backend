export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOTPExpiry = (): Date => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
};

export const isOTPExpired = (expiry?: Date): boolean => {
  if (!expiry) return true;
  return new Date() > expiry;
};
