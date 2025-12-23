import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  USER_SUSPEND = 'user_suspend',
  USER_BAN = 'user_ban',
  USER_UNLOCK = 'user_unlock',
  USER_DELETE = 'user_delete',
  USER_RESET_PASSWORD = 'user_reset_password',
  USER_IMPERSONATE = 'user_impersonate',
  KYC_APPROVE = 'kyc_approve',
  KYC_REJECT = 'kyc_reject',
  TRANSACTION_REFUND = 'transaction_refund',
  TRANSACTION_REVERSE = 'transaction_reverse',
  TRANSACTION_FLAG = 'transaction_flag',
  FEE_UPDATE = 'fee_update',
  PROVIDER_TOGGLE = 'provider_toggle',
  LIMIT_UPDATE = 'limit_update',
  BLOCKLIST_ADD = 'blocklist_add',
  BLOCKLIST_REMOVE = 'blocklist_remove',
  CONFIG_UPDATE = 'config_update',
  BROADCAST_SEND = 'broadcast_send',
  MAINTENANCE_TOGGLE = 'maintenance_toggle',
}

@Entity('admin_audit_logs')
@Index(['adminId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['targetUserId'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  adminId!: string; // ID of admin who performed action

  @Column()
  adminEmail!: string;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ nullable: true })
  targetUserId?: string; // User affected by action

  @Column({ nullable: true })
  targetResource?: string; // Transaction ID, KYC doc ID, etc.

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any; // Old/new values, reason, etc.

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
