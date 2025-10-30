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
exports.SplitPaymentRecipient = exports.RecipientStatus = void 0;
const typeorm_1 = require("typeorm");
const SplitPayment_1 = require("./SplitPayment");
var RecipientStatus;
(function (RecipientStatus) {
    RecipientStatus["PENDING"] = "pending";
    RecipientStatus["SUCCESS"] = "success";
    RecipientStatus["FAILED"] = "failed";
})(RecipientStatus || (exports.RecipientStatus = RecipientStatus = {}));
let SplitPaymentRecipient = class SplitPaymentRecipient {
};
exports.SplitPaymentRecipient = SplitPaymentRecipient;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SplitPaymentRecipient.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPaymentRecipient.prototype, "splitPaymentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SplitPayment_1.SplitPayment, (splitPayment) => splitPayment.recipients),
    (0, typeorm_1.JoinColumn)({ name: 'splitPaymentId' }),
    __metadata("design:type", SplitPayment_1.SplitPayment)
], SplitPaymentRecipient.prototype, "splitPayment", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SplitPaymentRecipient.prototype, "recipientAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SplitPaymentRecipient.prototype, "recipientName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SplitPaymentRecipient.prototype, "recipientEmail", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 8 }),
    __metadata("design:type", String)
], SplitPaymentRecipient.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SplitPaymentRecipient.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SplitPaymentRecipient.prototype, "createdAt", void 0);
exports.SplitPaymentRecipient = SplitPaymentRecipient = __decorate([
    (0, typeorm_1.Entity)('split_payment_recipients')
], SplitPaymentRecipient);
//# sourceMappingURL=SplitPaymentRecipient.js.map