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
exports.SplitPayment = exports.SplitPaymentStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const SplitPaymentRecipient_1 = require("./SplitPaymentRecipient");
const SplitPaymentExecution_1 = require("./SplitPaymentExecution");
var SplitPaymentStatus;
(function (SplitPaymentStatus) {
    SplitPaymentStatus["ACTIVE"] = "active";
    SplitPaymentStatus["INACTIVE"] = "inactive";
    SplitPaymentStatus["DELETED"] = "deleted";
})(SplitPaymentStatus || (exports.SplitPaymentStatus = SplitPaymentStatus = {}));
let SplitPayment = class SplitPayment {
};
exports.SplitPayment = SplitPayment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SplitPayment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPayment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], SplitPayment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPayment.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SplitPayment.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPayment.prototype, "chain", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPayment.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPayment.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPayment.prototype, "fromAddress", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 8 }),
    __metadata("design:type", String)
], SplitPayment.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('integer'),
    __metadata("design:type", Number)
], SplitPayment.prototype, "totalRecipients", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SplitPaymentStatus,
        default: SplitPaymentStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], SplitPayment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], SplitPayment.prototype, "executionCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SplitPayment.prototype, "lastExecutedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SplitPaymentRecipient_1.SplitPaymentRecipient, (recipient) => recipient.splitPayment, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], SplitPayment.prototype, "recipients", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SplitPaymentExecution_1.SplitPaymentExecution, (execution) => execution.splitPayment),
    __metadata("design:type", Array)
], SplitPayment.prototype, "executions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SplitPayment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SplitPayment.prototype, "updatedAt", void 0);
exports.SplitPayment = SplitPayment = __decorate([
    (0, typeorm_1.Entity)('split_payments')
], SplitPayment);
//# sourceMappingURL=SplitPayment.js.map