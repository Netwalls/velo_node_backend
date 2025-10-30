import { SplitPaymentExecution } from './SplitPaymentExecution';
export declare enum PaymentResultStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed"
}
export declare class SplitPaymentExecutionResult {
    id: string;
    executionId: string;
    execution: SplitPaymentExecution;
    recipientAddress: string;
    recipientName?: string;
    recipientEmail?: string;
    amount: string;
    status: PaymentResultStatus;
    txHash?: string;
    fees?: string;
    errorMessage?: string;
    createdAt: Date;
    processedAt?: Date;
}
//# sourceMappingURL=SplitPaymentExecutionResult.d.ts.map