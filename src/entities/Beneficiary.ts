import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export interface BeneficiaryRecipient {
  name: string;
  email?: string;
  address: string;
  amount?: string;
}

@Entity("beneficiaries")
export class Beneficiary {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  name!: string; // e.g., "Monthly Payroll", "Contractors List"

  @Column({ nullable: true })
  description?: string;

  @Column()
  chain!: string; // e.g., "solana"

  @Column()
  network!: string; // e.g., "testnet"

  @Column("simple-json")
  recipients!: BeneficiaryRecipient[]; // JSON array of recipients

  @Column("integer")
  recipientCount!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column("integer", { default: 0 })
  usageCount!: number; // How many times this beneficiary list has been used

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
