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
exports.DataPurchase = exports.Blockchain = exports.MobileNetwork = exports.DataPurchaseStatus = void 0;
// entities/DataPurchase.ts
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
// Define possible statuses for a data purchase
var DataPurchaseStatus;
(function (DataPurchaseStatus) {
    DataPurchaseStatus["PENDING"] = "pending";
    DataPurchaseStatus["PROCESSING"] = "processing";
    DataPurchaseStatus["COMPLETED"] = "completed";
    DataPurchaseStatus["FAILED"] = "failed"; // Something went wrong
})(DataPurchaseStatus || (exports.DataPurchaseStatus = DataPurchaseStatus = {}));
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
let DataPurchase = class DataPurchase {
};
exports.DataPurchase = DataPurchase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DataPurchase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, user => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_1.User)
], DataPurchase.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DataPurchase.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MobileNetwork
    }),
    __metadata("design:type", String)
], DataPurchase.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DataPurchaseStatus,
        default: DataPurchaseStatus.PENDING
    }),
    __metadata("design:type", String)
], DataPurchase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DataPurchase.prototype, "plan_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DataPurchase.prototype, "dataplan_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DataPurchase.prototype, "blockchain", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 8 }),
    __metadata("design:type", Number)
], DataPurchase.prototype, "crypto_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DataPurchase.prototype, "crypto_currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], DataPurchase.prototype, "fiat_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DataPurchase.prototype, "phone_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], DataPurchase.prototype, "transaction_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], DataPurchase.prototype, "provider_reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], DataPurchase.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DataPurchase.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], DataPurchase.prototype, "updated_at", void 0);
exports.DataPurchase = DataPurchase = __decorate([
    (0, typeorm_1.Entity)('data_purchases')
], DataPurchase);
//# sourceMappingURL=DataPurchase.js.map