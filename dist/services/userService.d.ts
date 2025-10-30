import { User } from '../entities/User';
import { UserAddress } from '../entities/UserAddress';
export declare function createUserIfNotExists(email: string, password: string): Promise<User | null>;
export declare function saveUserAddresses(user: User, addresses: any[]): Promise<UserAddress[]>;
//# sourceMappingURL=userService.d.ts.map