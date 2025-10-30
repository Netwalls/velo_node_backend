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
exports.SplitPaymentExecutionResult = exports.PaymentResultStatus = void 0;
const typeorm_1 = require("typeorm");
const SplitPaymentExecution_1 = require("./SplitPaymentExecution");
var PaymentResultStatus;
(function (PaymentResultStatus) {
    PaymentResultStatus["PENDING"] = "pending";
    PaymentResultStatus["SUCCESS"] = "success";
    PaymentResultStatus["FAILED"] = "failed";
})(PaymentResultStatus || (exports.PaymentResultStatus = PaymentResultStatus = {}));
let SplitPaymentExecutionResult = class SplitPaymentExecutionResult {
};
exports.SplitPaymentExecutionResult = SplitPaymentExecutionResult;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "executionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SplitPaymentExecution_1.SplitPaymentExecution, (execution) => execution.results),
    (0, typeorm_1.JoinColumn)({ name: 'executionId' }),
    __metadata("design:type", SplitPaymentExecution_1.SplitPaymentExecution)
], SplitPaymentExecutionResult.prototype, "execution", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "recipientAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "recipientName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "recipientEmail", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 8 }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentResultStatus,
        default: PaymentResultStatus.PENDING,
    }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "txHash", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 8, nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "fees", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecutionResult.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SplitPaymentExecutionResult.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SplitPaymentExecutionResult.prototype, "processedAt", void 0);
exports.SplitPaymentExecutionResult = SplitPaymentExecutionResult = __decorate([
    (0, typeorm_1.Entity)('split_payment_execution_results')
], SplitPaymentExecutionResult);
//# sourceMappingURL=SplitPaymentExecutionResult.js.map