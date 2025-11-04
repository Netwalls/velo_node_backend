"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectricityPurchase = exports.Blockchain = exports.MeterType = exports.ElectricityCompany = exports.ElectricityPurchaseStatus = void 0;
// entities/ElectricityPurchase.ts
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
// Define possible statuses for an electricity purchase
var ElectricityPurchaseStatus;
(function (ElectricityPurchaseStatus) {
    ElectricityPurchaseStatus["PENDING"] = "pending";
    ElectricityPurchaseStatus["PROCESSING"] = "processing";
    ElectricityPurchaseStatus["COMPLETED"] = "completed";
    ElectricityPurchaseStatus["FAILED"] = "failed"; // Something went wrong
})(ElectricityPurchaseStatus || (exports.ElectricityPurchaseStatus = ElectricityPurchaseStatus = {}));
// Define supported electricity companies
var ElectricityCompany;
(function (ElectricityCompany) {
    ElectricityCompany["EKO_ELECTRIC"] = "eko_electric";
    ElectricityCompany["IKEJA_ELECTRIC"] = "ikeja_electric";
    ElectricityCompany["ABUJA_ELECTRIC"] = "abuja_electric";
    ElectricityCompany["KANO_ELECTRIC"] = "kano_electric";
    ElectricityCompany["PORTHARCOURT_ELECTRIC"] = "portharcourt_electric";
    ElectricityCompany["JOS_ELECTRIC"] = "jos_electric";
    ElectricityCompany["IBADAN_ELECTRIC"] = "ibadan_electric";
    ElectricityCompany["KADUNA_ELECTRIC"] = "kaduna_electric";
    ElectricityCompany["ENUGU_ELECTRIC"] = "enugu_electric";
    ElectricityCompany["BENIN_ELECTRIC"] = "benin_electric";
    ElectricityCompany["YOLA_ELECTRIC"] = "yola_electric";
    ElectricityCompany["ABA_ELECTRIC"] = "aba_electric"; // 12
})(ElectricityCompany || (exports.ElectricityCompany = ElectricityCompany = {}));
// Define meter types
var MeterType;
(function (MeterType) {
    MeterType["PREPAID"] = "prepaid";
    MeterType["POSTPAID"] = "postpaid"; // 02
})(MeterType || (exports.MeterType = MeterType = {}));
// Define supported blockchains
var Blockchain;
(function (Blockchain) {
    Blockchain["ETHEREUM"] = "ethereum";
    Blockchain["BITCOIN"] = "bitcoin";
    Blockchain["SOLANA"] = "solana";
    Blockchain["STELLAR"] = "stellar";
    Blockchain["POLKADOT"] = "polkadot";
    Blockchain["STARKNET"] = "starknet";
    Blockchain["USDT_ERC20"] = "usdt-erc20";
})(Blockchain || (exports.Blockchain = Blockchain = {}));
let ElectricityPurchase = class ElectricityPurchase {
};
exports.ElectricityPurchase = ElectricityPurchase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, user => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_1.User)
], ElectricityPurchase.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ElectricityCompany
    }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "company_code", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MeterType
    }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "meter_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "meter_type_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "meter_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "phone_number", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ElectricityPurchaseStatus,
        default: ElectricityPurchaseStatus.PENDING
    }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "blockchain", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 8 }),
    __metadata("design:type", Number)
], ElectricityPurchase.prototype, "crypto_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "crypto_currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], ElectricityPurchase.prototype, "fiat_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "transaction_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "provider_reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], ElectricityPurchase.prototype, "meter_token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ElectricityPurchase.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ElectricityPurchase.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ElectricityPurchase.prototype, "updated_at", void 0);
exports.ElectricityPurchase = ElectricityPurchase = __decorate([
    (0, typeorm_1.Entity)('electricity_purchases')
], ElectricityPurchase);
//# sourceMappingURL=ElectricityPurchase.js.map