import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_USER = 'waiting_user',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('support_tickets')
@Index(['userId', 'status'])
@Index(['status', 'priority'])
@Index(['assignedTo'])
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  status!: SupportTicketStatus;

  @Column({ type: 'enum', enum: SupportTicketPriority, default: SupportTicketPriority.MEDIUM })
  priority!: SupportTicketPriority;

  @Column({ nullable: true })
  assignedTo?: string; // Admin ID

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any; // Related transaction, attachments, etc.

  @Column({ type: 'text', nullable: true })
  internalNotes?: string;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  resolvedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
