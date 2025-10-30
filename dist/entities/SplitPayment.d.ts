import { User } from './User';
import { SplitPaymentRecipient } from './SplitPaymentRecipient';
import { SplitPaymentExecution } from './SplitPaymentExecution';
export declare enum SplitPaymentStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    DELETED = "deleted"
}
export declare class SplitPayment {
    id: string;
    userId: string;
    user: User;
    title: string;
    description?: string;
    chain: string;
    network: string;
    currency: string;
    fromAddress: string;
    totalAmount: string;
    totalRecipients: number;
    status: SplitPaymentStatus;
    executionCount: number;
    lastExecutedAt?: Date;
    recipients: SplitPaymentRecipient[];
    executions: SplitPaymentExecution[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=SplitPayment.d.ts.map