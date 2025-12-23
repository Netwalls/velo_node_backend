import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BlocklistType {
  EMAIL = 'email',
  PHONE = 'phone',
  IP = 'ip',
  CARD = 'card',
  COUNTRY = 'country',
  WALLET_ADDRESS = 'wallet_address',
}

@Entity('blocklist')
@Index(['type', 'value'], { unique: true })
@Index(['isActive'])
export class Blocklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: BlocklistType })
  type!: BlocklistType;

  @Column()
  value!: string; // email, IP, country code, etc.

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  addedBy?: string; // Admin ID

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
