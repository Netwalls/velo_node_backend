import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { SplitPayment } from './SplitPayment';

export enum RecipientStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
}

@Entity('split_payment_recipients')
export class SplitPaymentRecipient {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    splitPaymentId!: string;

    @ManyToOne(() => SplitPayment, (splitPayment) => splitPayment.recipients)
    @JoinColumn({ name: 'splitPaymentId' })
    splitPayment!: SplitPayment;

    @Column()
    recipientAddress!: string;

    @Column({ nullable: true })
    recipientName?: string;

    @Column({ nullable: true })
    recipientEmail?: string;

    @Column('decimal', { precision: 20, scale: 8 })
    amount!: string;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
