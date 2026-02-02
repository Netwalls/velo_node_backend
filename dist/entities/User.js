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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserType = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserAddress_1 = require("./UserAddress");
const KYCDocument_1 = require("./KYCDocument");
const RefreshToken_1 = require("./RefreshToken");
const Company_1 = require("./Company");
const types_1 = require("../types");
var UserType;
(function (UserType) {
    UserType["COMPANY"] = "company";
    UserType["EMPLOYEE"] = "employee";
    UserType["INDIVIDUAL"] = "individual";
})(UserType || (exports.UserType = UserType = {}));
let User = class User {
    async hashPassword() {
        if (this.password &&
            !this.password.startsWith("$2a$") &&
            !this.password.startsWith("$2b$")) {
            const salt = await bcryptjs_1.default.genSalt(12);
            this.password = await bcryptjs_1.default.hash(this.password, salt);
        }
        // Ensure transaction PIN is hashed as well when present
        try {
            await this.hashTransactionPinIfNeeded();
        }
        catch (err) {
            console.error("Failed to hash transaction PIN:", err);
        }
    }
    /**
     * Hash transaction PIN similarly to the password when set/updated.
     */
    async hashTransactionPinIfNeeded() {
        if (this.transactionPin &&
            !this.transactionPin.startsWith("$2a$") &&
            !this.transactionPin.startsWith("$2b$")) {
            const salt = await bcryptjs_1.default.genSalt(12);
            this.transactionPin = await bcryptjs_1.default.hash(this.transactionPin, salt);
        }
    }
    async comparePassword(candidatePassword) {
        if (!this.password) {
            return false;
        }
        return await bcryptjs_1.default.compare(candidatePassword, this.password);
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", Object)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: UserType,
        default: UserType.INDIVIDUAL,
    }),
    __metadata("design:type", String)
], User.prototype, "userType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Company_1.Company, (company) => company.employees, { nullable: true }),
    __metadata("design:type", Company_1.Company)
], User.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "displayPicture", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "bankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "accountNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "accountName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "salary", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 18, scale: 8, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "usdtBalance", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 30, scale: 18, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "ethBalance", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 30, scale: 18, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "strkBalance", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 30, scale: 18, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "solBalance", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 30, scale: 8, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "btcBalance", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 30, scale: 7, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "xlmBalance", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 30, scale: 10, default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "dotBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "emailOTP", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "emailOTPExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phoneOTP", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "phoneOTPExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "passwordResetToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "passwordResetExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: types_1.KYCStatus,
        default: types_1.KYCStatus.PENDING,
    }),
    __metadata("design:type", Object)
], User.prototype, "kycStatus", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => UserAddress_1.UserAddress, (address) => address.user, { cascade: true }),
    __metadata("design:type", Object)
], User.prototype, "addresses", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => KYCDocument_1.KYCDocument, (kyc) => kyc.user, { cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", KYCDocument_1.KYCDocument)
], User.prototype, "kycDocument", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => RefreshToken_1.RefreshToken, (token) => token.user, { cascade: true }),
    __metadata("design:type", Object)
], User.prototype, "refreshTokens", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Object)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Object)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "transactionPin", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)("users")
], User);
//# sourceMappingURL=User.js.map