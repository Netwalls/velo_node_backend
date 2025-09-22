import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';

export enum ConversionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum ConversionType {
    MANUAL = 'manual',
    AUTOMATIC = 'automatic',
    WEBHOOK = 'webhook',
}

@Entity('conversions')
export class Conversion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    @Column()
    fromCurrency!: string;

    @Column()
    toCurrency!: string;

    @Column('decimal', { precision: 18, scale: 8 })
    inputAmount!: number;

    @Column('decimal', { precision: 18, scale: 8 })
    outputAmount!: number;

    @Column('decimal', { precision: 10, scale: 6 })
    exchangeRate!: number;

    @Column('decimal', { precision: 18, scale: 8 })
    feeAmount!: number;

    @Column('decimal', { precision: 18, scale: 8 })
    feeUSD!: number;

    @Column('decimal', { precision: 6, scale: 4, default: 0 })
    slippage!: number;

    @Column({
        type: 'enum',
        enum: ConversionStatus,
        default: ConversionStatus.PENDING,
    })
    status!: ConversionStatus;

    @Column({
        type: 'enum',
        enum: ConversionType,
        default: ConversionType.MANUAL,
    })
    type!: ConversionType;

    @Column({ nullable: true })
    fromAddress?: string;

    @Column({ nullable: true })
    toAddress?: string;

    @Column({ nullable: true })
    txHashFrom?: string;

    @Column({ nullable: true })
    txHashTo?: string;

    @Column({ nullable: true })
    dexUsed?: string;

    @Column('jsonb', { nullable: true })
    metadata?: any;

    @Column({ nullable: true })
    errorMessage?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;
}
