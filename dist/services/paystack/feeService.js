"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 * @param amount
 * @returns minimium fee or a max of 2000NGN
 */
function calculatePaystackFee(amount) {
    let fee = amount * 0.015;
    if (amount >= 2500)
        fee += 100;
    return Math.min(fee, 2000); // cap at ₦2000
}
/**
 *
 * @param amount
 * @returns (cardFee, fxFee) - the issuers fee and foreign exchange fee
 *
 */
function calculateCardPurchaseFee(amount) {
    const cardFee = amount * 0.04; // this fee is 4% for card issuers fee
    const fxFee = 50;
    return cardFee + fxFee;
}
// Platform fee is a flat 50NGN
// the function is isolated for potential future changes
function calculatePlatformFee() {
    return 50;
}
// Calculate total charge to user including all fees
// amount is the base amount user wants to fund
// returns breakdown of all fees and total amount to charge user
function calculateTotalCharge(amount) {
    const paystackFee = calculatePaystackFee(amount);
    const cardFee = calculateCardPurchaseFee(amount);
    const platformFee = calculatePlatformFee();
    const total = amount + paystackFee + cardFee + platformFee;
    return {
        userAmount: amount,
        paystackFee,
        cardFee,
        platformFee,
        totalToCharge: total,
    };
}
exports.default = calculateTotalCharge;
//# sourceMappingURL=feeService.js.map