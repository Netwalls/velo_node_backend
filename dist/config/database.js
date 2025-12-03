"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.AppDataSource = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const UserAddress_1 = require("../entities/UserAddress");
const KYCDocument_1 = require("../entities/KYCDocument");
const RefreshToken_1 = require("../entities/RefreshToken");
const Notification_1 = require("../entities/Notification");
const Transaction_1 = require("../entities/Transaction");
const Conversion_1 = require("../entities/Conversion");
const MerchantPayment_1 = require("../entities/MerchantPayment");
const SplitPayment_1 = require("../entities/SplitPayment");
const SplitPaymentRecipient_1 = require("../entities/SplitPaymentRecipient");
const SplitPaymentExecution_1 = require("../entities/SplitPaymentExecution");
const SplitPaymentExecutionResult_1 = require("../entities/SplitPaymentExecutionResult");
const Fee_1 = require("../entities/Fee");
const ProviderOrder_1 = __importDefault(require("../entities/ProviderOrder"));
const AirtimePurchase_1 = require("../entities/AirtimePurchase"); // ADD THIS IMPORT
const DataPurchase_1 = require("../entities/DataPurchase");
const ElectricityPurchase_1 = require("../entities/ElectricityPurchase");
const FiatTransaction_1 = require("../entities/FiatTransaction");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === "development",
    logging: ["error"],
    entities: [
        User_1.User,
        UserAddress_1.UserAddress,
        KYCDocument_1.KYCDocument,
        RefreshToken_1.RefreshToken,
        Notification_1.Notification,
        Transaction_1.Transaction,
        Conversion_1.Conversion,
        MerchantPayment_1.MerchantPayment,
        SplitPayment_1.SplitPayment,
        SplitPaymentExecution_1.SplitPaymentExecution,
        SplitPaymentRecipient_1.SplitPaymentRecipient,
        SplitPaymentExecutionResult_1.SplitPaymentExecutionResult,
        ProviderOrder_1.default,
        Fee_1.Fee,
        AirtimePurchase_1.AirtimePurchase, // ADD THIS LINE
        DataPurchase_1.DataPurchase,
        ElectricityPurchase_1.ElectricityPurchase,
        FiatTransaction_1.FiatTransaction,
    ],
    migrations: ["src/migrations/*.ts"],
    subscribers: ["src/subscribers/*.ts"],
    // ssl: { rejectUnauthorized: false },
});
const connectDB = async () => {
    try {
        await exports.AppDataSource.initialize();
        console.log("PostgreSQL Connected successfully");
        // Debug: Check if AirtimePurchase is registered
        const entityNames = exports.AppDataSource.entityMetadatas.map((meta) => meta.name);
        console.log("Registered entities:", entityNames);
    }
    catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=database.js.map