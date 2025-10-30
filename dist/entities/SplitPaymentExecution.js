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
exports.SplitPaymentExecution = exports.ExecutionStatus = void 0;
const typeorm_1 = require("typeorm");
const SplitPayment_1 = require("./SplitPayment");
const SplitPaymentExecutionResult_1 = require("./SplitPaymentExecutionResult");
var ExecutionStatus;
(function (ExecutionStatus) {
    ExecutionStatus["PENDING"] = "pending";
    ExecutionStatus["PROCESSING"] = "processing";
    ExecutionStatus["COMPLETED"] = "completed";
    ExecutionStatus["PARTIALLY_FAILED"] = "partially_failed";
    ExecutionStatus["FAILED"] = "failed";
})(ExecutionStatus || (exports.ExecutionStatus = ExecutionStatus = {}));
let SplitPaymentExecution = class SplitPaymentExecution {
};
exports.SplitPaymentExecution = SplitPaymentExecution;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SplitPaymentExecution.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPaymentExecution.prototype, "splitPaymentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SplitPayment_1.SplitPayment, (splitPayment) => splitPayment.executions),
    (0, typeorm_1.JoinColumn)({ name: 'splitPaymentId' }),
    __metadata("design:type", SplitPayment_1.SplitPayment)
], SplitPaymentExecution.prototype, "splitPayment", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 8 }),
    __metadata("design:type", String)
], SplitPaymentExecution.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('integer'),
    __metadata("design:type", Number)
], SplitPaymentExecution.prototype, "totalRecipients", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], SplitPaymentExecution.prototype, "successfulPayments", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], SplitPaymentExecution.prototype, "failedPayments", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ExecutionStatus,
        default: ExecutionStatus.PENDING,
    }),
    __metadata("design:type", String)
], SplitPaymentExecution.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Array)
], SplitPaymentExecution.prototype, "batchTxHashes", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 8, nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecution.prototype, "totalFees", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], SplitPaymentExecution.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SplitPaymentExecutionResult_1.SplitPaymentExecutionResult, (result) => result.execution, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], SplitPaymentExecution.prototype, "results", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SplitPaymentExecution.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SplitPaymentExecution.prototype, "completedAt", void 0);
exports.SplitPaymentExecution = SplitPaymentExecution = __decorate([
    (0, typeorm_1.Entity)('split_payment_executions')
], SplitPaymentExecution);
//# sourceMappingURL=SplitPaymentExecution.js.map