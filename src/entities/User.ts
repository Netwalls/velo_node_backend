import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    OneToOne,
    JoinColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { IsEmail, MinLength } from 'class-validator';
import bcrypt from 'bcryptjs';
import { UserAddress } from './UserAddress';
import { KYCDocument } from './KYCDocument';
import { RefreshToken } from './RefreshToken';
import { KYCStatus } from '../types';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string | undefined;

    @Column({ unique: true })
    @IsEmail()
    email!: string;

    @Column()
    @MinLength(6)
    password!: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    phoneNumber?: string;

    @Column({ unique: true, nullable: true })
    username?: string;

    @Column({ nullable: true })
    displayPicture?: string;

    @Column({ nullable: true })
    bankName?: string;

    @Column({ nullable: true })
    accountNumber?: string;

    @Column({ nullable: true })
    accountName?: string;

    @Column({ nullable: true })
    routingNumber?: string;

    @Column({ nullable: true })
    swiftCode?: string;

    @Column({ default: false })
    isEmailVerified!: boolean;

    @Column('decimal', { precision: 18, scale: 8, default: 0 })
    usdtBalance!: number;

    @Column({ nullable: true })
    emailOTP?: string;

    @Column({ type: 'timestamp', nullable: true })
    emailOTPExpiry?: Date;

    @Column({ nullable: true })
    phoneOTP?: string;

    @Column({ type: 'timestamp', nullable: true })
    phoneOTPExpiry?: Date;

    @Column({ nullable: true })
    passwordResetToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    passwordResetExpiry?: Date;

    @Column({
        type: 'enum',
        enum: KYCStatus,
        default: KYCStatus.PENDING,
    })
    kycStatus: KYCStatus | undefined;

    @OneToMany(() => UserAddress, (address) => address.user, { cascade: true })
    addresses: UserAddress[] | undefined;

    @OneToOne(() => KYCDocument, (kyc) => kyc.user, { cascade: true })
    @JoinColumn()
    kycDocument?: KYCDocument;

    @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
    refreshTokens: RefreshToken[] | undefined;

    @CreateDateColumn()
    createdAt: Date | undefined;

    @UpdateDateColumn()
    updatedAt: Date | undefined;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (
            this.password &&
            !this.password.startsWith('$2a$') &&
            !this.password.startsWith('$2b$')
        ) {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }

    async comparePassword(candidatePassword: string): Promise<boolean> {
        if (!this.password) {
            return false;
        }
        return await bcrypt.compare(candidatePassword, this.password);
    }
}
