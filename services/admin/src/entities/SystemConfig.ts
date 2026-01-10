import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string; // e.g., 'platform_fee_percent', 'maintenance_mode', 'provider_paystack_enabled'

  @Column({ type: 'text' })
  value!: string; // Store as string, parse as needed

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  updatedBy?: string; // Admin ID

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
