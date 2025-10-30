import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TransactionType {
	CREDIT = 'CREDIT',     // Money coming in (deposits, refunds)
	DEBIT = 'DEBIT',       // Money going out (purchases, withdrawals)
}

export enum TransactionStatus {
	PENDING = 'PENDING',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED',
	CANCELLED = 'CANCELLED',
}

@Entity('user_transactions')
@Index(['userId', 'createdAt'])
@Index(['userId', 'chain', 'network'])
@Index(['reference'])
export class UserTransaction {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column()
	@Index()
	userId!: string;

	@Column({
		type: 'enum',
		enum: TransactionType,
	})
	type!: TransactionType;

	@Column()
	token!: string; // BTC, ETH, SOL, USDT, etc.

	@Column()
	chain!: string; // bitcoin, ethereum, solana, etc.

	@Column({
		type: 'enum',
		enum: ['mainnet', 'testnet'],
		default: 'mainnet'
	})
	network!: 'mainnet' | 'testnet';

	@Column('decimal', { precision: 20, scale: 8 })
	amount!: number;

	@Column({
		type: 'enum',
		enum: TransactionStatus,
		default: TransactionStatus.PENDING,
	})
	status!: TransactionStatus;

	@Column({ nullable: true })
	reference?: string; // order-{orderId}, refund-{orderId}, deposit-{txHash}

	@Column({ type: 'text', nullable: true })
	description?: string;

	@Column({ type: 'json', nullable: true })
	metadata?: any; // Store additional info (txHash, exchange rates, etc.)

	@CreateDateColumn()
	createdAt!: Date;

	@Column({ nullable: true })
	completedAt?: Date;
}