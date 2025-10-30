import { User } from './User';
export declare class Transaction {
    id: string;
    userId: string;
    user: User;
    type: string;
    amount: number;
    chain: string;
    network?: string;
    toAddress: string;
    fromAddress: string;
    txHash: string;
    details?: any;
    status: 'pending' | 'confirmed' | 'failed';
    error?: string;
    createdAt: Date;
}
//# sourceMappingURL=Transaction.d.ts.map