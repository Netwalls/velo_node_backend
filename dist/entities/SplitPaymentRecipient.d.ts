import { SplitPayment } from './SplitPayment';
export declare enum RecipientStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed"
}
export declare class SplitPaymentRecipient {
    id: string;
    splitPaymentId: string;
    splitPayment: SplitPayment;
    recipientAddress: string;
    recipientName?: string;
    recipientEmail?: string;
    amount: string;
    isActive: boolean;
    createdAt: Date;
}
//# sourceMappingURL=SplitPaymentRecipient.d.ts.map