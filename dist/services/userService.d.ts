import { User, UserType } from '../entities/User';
import { UserAddress } from '../entities/UserAddress';
export declare function createUserIfNotExists(email: string, password: string, userType?: UserType, companyId?: string, emailOTP?: string, emailOTPExpiry?: Date): Promise<User | null>;
export declare function saveUserAddresses(user: User, addresses: any[]): Promise<UserAddress[]>;
//# sourceMappingURL=userService.d.ts.map