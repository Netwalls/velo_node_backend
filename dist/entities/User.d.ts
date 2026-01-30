import { UserAddress } from "./UserAddress";
import { KYCDocument } from "./KYCDocument";
import { RefreshToken } from "./RefreshToken";
import { Company } from "./Company";
import { KYCStatus } from "../types";
export declare enum UserType {
    COMPANY = "company",
    EMPLOYEE = "employee",
    INDIVIDUAL = "individual"
}
export declare class User {
    id: string | undefined;
    email: string;
    password: string;
    userType: UserType;
    company?: Company;
    companyId?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    username?: string;
    displayPicture?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    position?: string;
    salary?: number;
    isEmailVerified: boolean;
    usdtBalance: number;
    ethBalance: number;
    strkBalance: number;
    solBalance: number;
    btcBalance: number;
    xlmBalance: number;
    dotBalance: number;
    emailOTP?: string;
    emailOTPExpiry?: Date;
    phoneOTP?: string;
    phoneOTPExpiry?: Date;
    passwordResetToken?: string;
    passwordResetExpiry?: Date;
    kycStatus: KYCStatus | undefined;
    addresses: UserAddress[] | undefined;
    kycDocument?: KYCDocument;
    refreshTokens: RefreshToken[] | undefined;
    createdAt: Date | undefined;
    updatedAt: Date | undefined;
    hashPassword(): Promise<void>;
    /**
     * Transaction PIN: stored hashed for security. Expect a 4-digit numeric PIN.
     */
    transactionPin?: string;
    /**
     * Hash transaction PIN similarly to the password when set/updated.
     */
    hashTransactionPinIfNeeded(): Promise<void>;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
//# sourceMappingURL=User.d.ts.map