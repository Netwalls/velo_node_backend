import { User } from './User';
import { ChainType, NetworkType } from '../types';
export declare class UserAddress {
    chain?: ChainType;
    network: NetworkType;
    id: string;
    address?: string;
    encryptedPrivateKey?: string;
    isVerified: boolean;
    user: User;
    publicKey?: string;
    constructorCalldata?: string;
    classHash?: string;
    userId: string;
    addedAt: Date;
    lastKnownBalance: number;
}
//# sourceMappingURL=UserAddress.d.ts.map