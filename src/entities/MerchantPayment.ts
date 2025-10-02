import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
} from 'typeorm';
import { User } from './User';

export enum MerchantPaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('merchant_payments')
export class MerchantPayment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string; // merchant user

    @ManyToOne(() => User)
    user!: User;

    @Column()
    address!: string; // crypto address to receive payment

    @Column('decimal', { precision: 18, scale: 8 })
    amount!: number;

    @Column({
        type: 'enum',
        enum: MerchantPaymentStatus,
        default: MerchantPaymentStatus.PENDING,
    })
    status!: MerchantPaymentStatus;

    @Column({ nullable: true })
    txHash!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ nullable: true })
    completedAt!: Date;

    // One address per chain
    @Column({ nullable: true })
    ethAddress!: string;

    @Column({ nullable: true })
    btcAddress!: string;

    @Column({ nullable: true })
    solAddress!: string;

    @Column({ nullable: true })
    strkAddress!: string;

    @Column({ nullable: true })
    usdtErc20Address!: string;

    @Column({ nullable: true })
    usdtTrc20Address!: string;

    @Column({ nullable: true })
    chain!: string; // The chain selected for this payment

    @Column({ nullable: true })
    network!: string; // e.g., 'mainnet', 'testnet'
}
