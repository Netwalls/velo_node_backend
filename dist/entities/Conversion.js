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
exports.Conversion = exports.ConversionType = exports.ConversionStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var ConversionStatus;
(function (ConversionStatus) {
    ConversionStatus["PENDING"] = "pending";
    ConversionStatus["PROCESSING"] = "processing";
    ConversionStatus["COMPLETED"] = "completed";
    ConversionStatus["FAILED"] = "failed";
    ConversionStatus["CANCELLED"] = "cancelled";
})(ConversionStatus || (exports.ConversionStatus = ConversionStatus = {}));
var ConversionType;
(function (ConversionType) {
    ConversionType["MANUAL"] = "manual";
    ConversionType["AUTOMATIC"] = "automatic";
    ConversionType["WEBHOOK"] = "webhook";
})(ConversionType || (exports.ConversionType = ConversionType = {}));
let Conversion = class Conversion {
};
exports.Conversion = Conversion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Conversion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Conversion.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", User_1.User)
], Conversion.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Conversion.prototype, "fromCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Conversion.prototype, "toCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], Conversion.prototype, "inputAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], Conversion.prototype, "outputAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 6 }),
    __metadata("design:type", Number)
], Conversion.prototype, "exchangeRate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], Conversion.prototype, "feeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], Conversion.prototype, "feeUSD", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 6, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], Conversion.prototype, "slippage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ConversionStatus,
        default: ConversionStatus.PENDING,
    }),
    __metadata("design:type", String)
], Conversion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ConversionType,
        default: ConversionType.MANUAL,
    }),
    __metadata("design:type", String)
], Conversion.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversion.prototype, "fromAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversion.prototype, "toAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversion.prototype, "txHashFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversion.prototype, "txHashTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversion.prototype, "dexUsed", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Conversion.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversion.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Conversion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Conversion.prototype, "completedAt", void 0);
exports.Conversion = Conversion = __decorate([
    (0, typeorm_1.Entity)('conversions')
], Conversion);
//# sourceMappingURL=Conversion.js.map