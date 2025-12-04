import { User } from './User';
export declare class FiatTransaction {
    id: string;
    user: User;
    userId: string;
    amount: number;
    reference: string;
    settled?: boolean;
    crypto: string;
    status: 'pending' | 'success' | 'failed';
    paymentDescription?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=FiatTransaction.d.ts.map