"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.ChainType = exports.KYCStatus = exports.NetworkType = void 0;
var NetworkType;
(function (NetworkType) {
    NetworkType["MAINNET"] = "mainnet";
    NetworkType["TESTNET"] = "testnet";
})(NetworkType || (exports.NetworkType = NetworkType = {}));
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["PENDING"] = "pending";
    KYCStatus["APPROVED"] = "approved";
    KYCStatus["REJECTED"] = "rejected";
})(KYCStatus || (exports.KYCStatus = KYCStatus = {}));
var ChainType;
(function (ChainType) {
    ChainType["ETHEREUM"] = "ethereum";
    ChainType["BITCOIN"] = "bitcoin";
    ChainType["POLYGON"] = "polygon";
    ChainType["BSC"] = "bsc";
    ChainType["SOLANA"] = "solana";
    ChainType["STARKNET"] = "starknet";
    ChainType["STELLAR"] = "stellar";
    ChainType["POLKADOT"] = "polkadot";
    ChainType["USDT_ERC20"] = "usdt_erc20";
    ChainType["USDT_TRC20"] = "usdt_trc20";
})(ChainType || (exports.ChainType = ChainType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["LOGIN"] = "login";
    NotificationType["LOGOUT"] = "logout";
    NotificationType["REGISTRATION"] = "registration";
    NotificationType["SEND_MONEY"] = "send_money";
    NotificationType["RECEIVE_MONEY"] = "receive_money";
    NotificationType["SWAP"] = "swap";
    NotificationType["DEPOSIT"] = "deposit";
    NotificationType["WITHDRAWAL"] = "withdrawal";
    NotificationType["OTP_VERIFIED"] = "otp_verified";
    NotificationType["PASSWORD_CHANGE"] = "password_change";
    NotificationType["SECURITY_ALERT"] = "security_alert";
    NotificationType["CONVERSION_STARTED"] = "conversion_started";
    NotificationType["CONVERSION_COMPLETED"] = "conversion_completed";
    NotificationType["CONVERSION_FAILED"] = "conversion_failed";
    NotificationType["CONVERSION_CANCELLED"] = "conversion_cancelled";
    NotificationType["QR_PAYMENT_CREATED"] = "qr_payment_created";
    NotificationType["QR_PAYMENT_RECEIVED"] = "qr_payment_received";
    NotificationType["AIRTIME_PURCHASE"] = "airtime_purchase";
    NotificationType["DATA_PURCHASE"] = "data_purchase";
    NotificationType["UTILITY_PAYMENT"] = "utility_payment";
    NotificationType["PURCHASE_FAILED"] = "purchase_failed";
    NotificationType["SEND"] = "Payment sent";
    NotificationType["DEPLOY"] = "DEPLOY";
    NotificationType["QR_PAYMENT_COMPLETED"] = "QR_PAYMENT_COMPLETED";
    NotificationType["CANCELLED"] = "CANCELLED";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=index.js.map