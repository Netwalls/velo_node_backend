import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Company } from "./Company";
import { User } from "./User";
import { KYCStatus } from "../types";

export enum EmploymentStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ON_LEAVE = "on_leave",
  TERMINATED = "terminated",
}

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn("uuid")
  id: string | undefined;

  // Reference to the user account
  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @Column()
  userId!: string;

  // Reference to the company
  @ManyToOne(() => Company, (company) => company.employees)
  company!: Company;

  @Column()
  companyId!: string;

  // Company code for joining (denormalized for quick access)
  @Column()
  companyCode!: string;

  // Employee Details
  @Column({ nullable: true })
  employeeId?: string; // Custom employee ID (e.g., EMP001)

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ nullable: true })
  department?: string;

  // Salary Information
  @Column("decimal", { precision: 18, scale: 2, nullable: true })
  salary?: number;

  @Column({ default: "USD" })
  salaryCurrency!: string;

  // Wallet Information
  @Column({ nullable: true })
  walletAddress?: string;

  @Column({ default: "solana" })
  preferredChain!: string;

  // Employment Status
  @Column({
    type: "enum",
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
  })
  employmentStatus!: EmploymentStatus;

  @Column({ type: "date", nullable: true })
  hireDate?: Date;

  @Column({ type: "date", nullable: true })
  terminationDate?: Date;

  // KYC Status (inherited from User but tracked here too)
  @Column({
    type: "enum",
    enum: KYCStatus,
    default: KYCStatus.PENDING,
  })
  kycStatus!: KYCStatus;

  // Payment Preferences
  @Column("simple-json", { nullable: true })
  paymentPreferences?: {
    usdc: number; // Percentage
    sol: number; // Percentage
    otherTokens?: { [key: string]: number };
  };

  // Metadata
  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date | undefined;

  @UpdateDateColumn()
  updatedAt: Date | undefined;
}
