import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FraudAlertType {
  HIGH_VELOCITY = 'high_velocity',
  SUSPICIOUS_AMOUNT = 'suspicious_amount',
  MULTIPLE_CARDS = 'multiple_cards',
  CHARGEBACK_RISK = 'chargeback_risk',
  UNUSUAL_PATTERN = 'unusual_pattern',
  BLOCKLISTED_MATCH = 'blocklisted_match',
}

export enum FraudAlertStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  CONFIRMED_FRAUD = 'confirmed_fraud',
  FALSE_POSITIVE = 'false_positive',
}

@Entity('fraud_alerts')
@Index(['userId', 'status'])
@Index(['type', 'createdAt'])
@Index(['status'])
export class FraudAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ type: 'enum', enum: FraudAlertType })
  type!: FraudAlertType;

  @Column({ type: 'enum', enum: FraudAlertStatus, default: FraudAlertStatus.PENDING })
  status!: FraudAlertStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  riskScore?: number; // 0-100

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence?: any; // Transaction IDs, patterns detected, etc.

  @Column({ nullable: true })
  reviewedBy?: string; // Admin ID

  @Column({ nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
