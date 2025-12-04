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
exports.FiatTransaction = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let FiatTransaction = class FiatTransaction {
};
exports.FiatTransaction = FiatTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FiatTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], FiatTransaction.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], FiatTransaction.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], FiatTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], FiatTransaction.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], FiatTransaction.prototype, "settled", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], FiatTransaction.prototype, "crypto", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'success', 'failed'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], FiatTransaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], FiatTransaction.prototype, "paymentDescription", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FiatTransaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FiatTransaction.prototype, "updatedAt", void 0);
exports.FiatTransaction = FiatTransaction = __decorate([
    (0, typeorm_1.Entity)('fiat_transactions')
], FiatTransaction);
//# sourceMappingURL=FiatTransaction.js.map