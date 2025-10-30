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
exports.MerchantPayment = exports.MerchantPaymentStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var MerchantPaymentStatus;
(function (MerchantPaymentStatus) {
    MerchantPaymentStatus["PENDING"] = "pending";
    MerchantPaymentStatus["COMPLETED"] = "completed";
    MerchantPaymentStatus["FAILED"] = "failed";
    MerchantPaymentStatus["CANCELLED"] = "cancelled";
})(MerchantPaymentStatus || (exports.MerchantPaymentStatus = MerchantPaymentStatus = {}));
let MerchantPayment = class MerchantPayment {
};
exports.MerchantPayment = MerchantPayment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MerchantPayment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MerchantPayment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    __metadata("design:type", User_1.User)
], MerchantPayment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MerchantPayment.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], MerchantPayment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MerchantPaymentStatus,
        default: MerchantPaymentStatus.PENDING,
    }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "txHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MerchantPayment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], MerchantPayment.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "ethAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "btcAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "solAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "strkAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "polkadotAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "usdtErc20Address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "usdtTrc20Address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "chain", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MerchantPayment.prototype, "network", void 0);
exports.MerchantPayment = MerchantPayment = __decorate([
    (0, typeorm_1.Entity)('merchant_payments')
], MerchantPayment);
//# sourceMappingURL=MerchantPayment.js.map