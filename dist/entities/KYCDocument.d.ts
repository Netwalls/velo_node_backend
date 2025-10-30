import { User } from './User';
import { KYCStatus } from '../types';
export declare class KYCDocument {
    id: string | undefined;
    status: KYCStatus | undefined;
    documentType?: string;
    documentUrl?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
    user: User | undefined;
    userId: string | undefined;
    createdAt: Date | undefined;
    updatedAt: Date | undefined;
}
//# sourceMappingURL=KYCDocument.d.ts.map