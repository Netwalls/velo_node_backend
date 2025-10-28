"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOTPExpired = exports.getOTPExpiry = exports.generateOTP = void 0;
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const getOTPExpiry = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d;
};
exports.getOTPExpiry = getOTPExpiry;
const isOTPExpired = (expiry) => {
    if (!expiry)
        return true;
    return new Date() > expiry;
};
exports.isOTPExpired = isOTPExpired;
