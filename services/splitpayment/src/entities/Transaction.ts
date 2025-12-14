import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    @Column()
    type!: string; // 'send', 'receive', etc.

    @Column('decimal', { precision: 20, scale: 8 })
    amount!: number;

    @Column()
    chain!: string;

    @Column({ nullable: true })
    network?: string; // 'mainnet', 'testnet', etc.

    @Column()
    toAddress!: string;

    @Column()
    fromAddress!: string;

    @Column()
    txHash!: string;

    @Column('jsonb', { nullable: true })
    details?: any;

    @Column({ default: 'pending' })
    status!: 'pending' | 'confirmed' | 'failed';

    @Column('text', { nullable: true })
    error?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
