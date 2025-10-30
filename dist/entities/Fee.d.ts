import { User } from './User';
import { Transaction } from './Transaction';
export declare class Fee {
    id: string;
    userId: string;
    user?: User;
    transactionId?: string;
    transaction?: Transaction;
    amount: string;
    fee: string;
    total: string;
    tier: string;
    feePercentage: string;
    feeType: string;
    currency: string;
    description?: string;
    chain?: string;
    network?: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=Fee.d.ts.map