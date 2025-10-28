import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ProviderOrderStatus {
    CREATED = 'created',
    PENDING = 'pending',
    PAID = 'paid',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('provider_orders')
export class ProviderOrder {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: true })
    userId?: string;

    @Column()
    requestId!: string;

    @Column()
    mobileNetwork!: string;

    @Column({ nullable: true })
    mobileNumber?: string;

    @Column({ nullable: true })
    chain?: string; // e.g., btc, eth, sol

    @Column('decimal', { precision: 18, scale: 8 })
    amountNGN!: number;

    @Column()
    token!: string; // BTC, ETH, SOL, XLM, DOT, USDT

    @Column('decimal', { precision: 32, scale: 18, nullable: true })
    requiredTokenAmount?: number;

    @Column({ type: 'enum', enum: ProviderOrderStatus, default: ProviderOrderStatus.CREATED })
    status!: ProviderOrderStatus;

    @Column({ nullable: true })
    depositTxHash?: string;

    @Column('json', { nullable: true })
    providerResponse?: any;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

export default ProviderOrder;
