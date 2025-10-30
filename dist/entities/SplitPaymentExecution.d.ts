import { SplitPayment } from './SplitPayment';
import { SplitPaymentExecutionResult } from './SplitPaymentExecutionResult';
export declare enum ExecutionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    PARTIALLY_FAILED = "partially_failed",
    FAILED = "failed"
}
export declare class SplitPaymentExecution {
    id: string;
    splitPaymentId: string;
    splitPayment: SplitPayment;
    totalAmount: string;
    totalRecipients: number;
    successfulPayments: number;
    failedPayments: number;
    status: ExecutionStatus;
    batchTxHashes?: string[];
    totalFees?: string;
    errorMessage?: string;
    results: SplitPaymentExecutionResult[];
    createdAt: Date;
    completedAt?: Date;
}
//# sourceMappingURL=SplitPaymentExecution.d.ts.map