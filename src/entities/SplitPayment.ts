import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from './User';
import { SplitPaymentRecipient } from './SplitPaymentRecipient';
import { SplitPaymentExecution } from './SplitPaymentExecution';

export enum SplitPaymentStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    DELETED = 'deleted',
}

@Entity('split_payments')
export class SplitPayment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column()
    title!: string;

    @Column({ nullable: true })
    description?: string;

    @Column()
    chain!: string;

    @Column()
    network!: string;

    @Column()
    currency!: string;

    @Column()
    fromAddress!: string;

    @Column('decimal', { precision: 20, scale: 8 })
    totalAmount!: string;

    @Column('integer')
    totalRecipients!: number;

    @Column({
        type: 'enum',
        enum: SplitPaymentStatus,
        default: SplitPaymentStatus.ACTIVE,
    })
    status!: SplitPaymentStatus;

    @Column('integer', { default: 0 })
    executionCount!: number;

    @Column({ nullable: true })
    lastExecutedAt?: Date;

    @OneToMany(
        () => SplitPaymentRecipient,
        (recipient) => recipient.splitPayment,
        {
            cascade: true,
        }
    )
    recipients!: SplitPaymentRecipient[];

    @OneToMany(
        () => SplitPaymentExecution,
        (execution) => execution.splitPayment
    )
    executions!: SplitPaymentExecution[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
