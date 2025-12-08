import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MerchantPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('merchant_payments')
export class MerchantPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  address!: string; // Primary address for selected chain

  @Column('decimal', { precision: 18, scale: 8 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: MerchantPaymentStatus,
    default: MerchantPaymentStatus.PENDING,
  })
  status!: MerchantPaymentStatus;

  @Column({ nullable: true })
  txHash?: string;

  @Column({ nullable: true })
  transactionHash?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt?: Date;

  // Chain-specific addresses
  @Column({ nullable: true })
  ethAddress?: string;

  @Column({ nullable: true })
  btcAddress?: string;

  @Column({ nullable: true })
  solAddress?: string;

  @Column({ nullable: true })
  strkAddress?: string;

  @Column({ nullable: true })
  stellarAddress?: string;

  @Column({ nullable: true })
  polkadotAddress?: string;

  @Column({ nullable: true })
  usdtErc20Address?: string;

  @Column({ nullable: true })
  usdtTrc20Address?: string;

  // Payment metadata
  @Column({ nullable: true })
  chain!: string;

  @Column({ nullable: true })
  network!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true })
  qrData?: string; // QR code data string
}
