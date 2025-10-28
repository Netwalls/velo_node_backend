import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { IsEmail, MinLength } from 'class-validator';
import bcrypt from 'bcryptjs';
import { RefreshToken } from './RefreshToken';

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

    @Column({ default: false })
    isEmailVerified!: boolean;

    @Column({ nullable: true })
    emailOTP?: string;

    @Column({ type: 'timestamptz', nullable: true })
    emailOTPExpiry?: Date;

    @Column({ nullable: true })
    passwordResetToken?: string;

    @Column({ type: 'timestamptz', nullable: true })
    passwordResetExpiry?: Date;

    @Column({ nullable: true })
    transactionPin?: string;

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
        if (!this.password) return false;
        return await bcrypt.compare(candidatePassword, this.password);
    }
}
