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
exports.AirtimePurchase = exports.Blockchain = exports.MobileNetwork = exports.AirtimePurchaseStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
// Define possible statuses for an airtime purchase
var AirtimePurchaseStatus;
(function (AirtimePurchaseStatus) {
    AirtimePurchaseStatus["PENDING"] = "pending";
    AirtimePurchaseStatus["PROCESSING"] = "processing";
    AirtimePurchaseStatus["COMPLETED"] = "completed";
    AirtimePurchaseStatus["FAILED"] = "failed";
})(AirtimePurchaseStatus || (exports.AirtimePurchaseStatus = AirtimePurchaseStatus = {}));
// Define supported mobile networks
var MobileNetwork;
(function (MobileNetwork) {
    MobileNetwork["MTN"] = "mtn";
    MobileNetwork["GLO"] = "glo";
    MobileNetwork["AIRTEL"] = "airtel";
    MobileNetwork["ETISALAT"] = "9mobile";
})(MobileNetwork || (exports.MobileNetwork = MobileNetwork = {}));
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
let AirtimePurchase = class AirtimePurchase {
};
exports.AirtimePurchase = AirtimePurchase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, user => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_1.User)
], AirtimePurchase.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MobileNetwork
    }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AirtimePurchaseStatus,
        default: AirtimePurchaseStatus.PENDING
    }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "blockchain", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 8 }),
    __metadata("design:type", Number)
], AirtimePurchase.prototype, "crypto_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "crypto_currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], AirtimePurchase.prototype, "fiat_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "phone_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "transaction_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AirtimePurchase.prototype, "provider_reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], AirtimePurchase.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AirtimePurchase.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AirtimePurchase.prototype, "updated_at", void 0);
exports.AirtimePurchase = AirtimePurchase = __decorate([
    (0, typeorm_1.Entity)('airtime_purchases')
], AirtimePurchase);
