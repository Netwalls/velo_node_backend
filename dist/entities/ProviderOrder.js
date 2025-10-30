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
exports.ProviderOrder = exports.ProviderOrderStatus = void 0;
const typeorm_1 = require("typeorm");
var ProviderOrderStatus;
(function (ProviderOrderStatus) {
    ProviderOrderStatus["CREATED"] = "created";
    ProviderOrderStatus["PENDING"] = "pending";
    ProviderOrderStatus["PAID"] = "paid";
    ProviderOrderStatus["PROCESSING"] = "processing";
    ProviderOrderStatus["COMPLETED"] = "completed";
    ProviderOrderStatus["FAILED"] = "failed";
})(ProviderOrderStatus || (exports.ProviderOrderStatus = ProviderOrderStatus = {}));
let ProviderOrder = class ProviderOrder {
};
exports.ProviderOrder = ProviderOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProviderOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProviderOrder.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProviderOrder.prototype, "requestId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProviderOrder.prototype, "mobileNetwork", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProviderOrder.prototype, "mobileNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProviderOrder.prototype, "chain", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], ProviderOrder.prototype, "amountNGN", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProviderOrder.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 32, scale: 18, nullable: true }),
    __metadata("design:type", Number)
], ProviderOrder.prototype, "requiredTokenAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProviderOrderStatus, default: ProviderOrderStatus.CREATED }),
    __metadata("design:type", String)
], ProviderOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProviderOrder.prototype, "depositTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], ProviderOrder.prototype, "providerResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['mainnet', 'testnet'],
        default: 'mainnet',
        nullable: true,
    }),
    __metadata("design:type", String)
], ProviderOrder.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProviderOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ProviderOrder.prototype, "updatedAt", void 0);
exports.ProviderOrder = ProviderOrder = __decorate([
    (0, typeorm_1.Entity)('provider_orders')
], ProviderOrder);
exports.default = ProviderOrder;
//# sourceMappingURL=ProviderOrder.js.map