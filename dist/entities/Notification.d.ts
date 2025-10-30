import { User } from './User';
import { NotificationType } from '../types';
export declare class Notification {
    id: string;
    userId: string;
    user: User;
    type: NotificationType;
    title: string;
    message: string;
    details?: any;
    isRead: boolean;
    isArchived: boolean;
    createdAt: Date;
}
//# sourceMappingURL=Notification.d.ts.map