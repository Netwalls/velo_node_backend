import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { SplitPaymentExecution } from './SplitPaymentExecution';

export enum PaymentResultStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
}

@Entity('split_payment_execution_results')
export class SplitPaymentExecutionResult {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    executionId!: string;

    @ManyToOne(() => SplitPaymentExecution, (execution) => execution.results)
    @JoinColumn({ name: 'executionId' })
    execution!: SplitPaymentExecution;

    @Column()
    recipientAddress!: string;

    @Column({ nullable: true })
    recipientName?: string;

    @Column({ nullable: true })
    recipientEmail?: string;

    @Column('decimal', { precision: 20, scale: 8 })
    amount!: string;

    @Column({
        type: 'enum',
        enum: PaymentResultStatus,
        default: PaymentResultStatus.PENDING,
    })
    status!: PaymentResultStatus;

    @Column({ nullable: true })
    txHash?: string;

    @Column('decimal', { precision: 20, scale: 8, nullable: true })
    fees?: string;

    @Column('text', { nullable: true })
    errorMessage?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ nullable: true })
    processedAt?: Date;
}
