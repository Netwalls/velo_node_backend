import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';
import { ChainType, NetworkType } from '../types';

@Entity('user_addresses')
export class UserAddress {
    @Column({
        type: 'enum',
        enum: ChainType,
    })
    chain!: ChainType;

    @Column({ type: 'enum', enum: NetworkType, default: NetworkType.MAINNET })
    network!: NetworkType;

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('text')
    address!: string;

    @Column('text', { nullable: true })
    encryptedPrivateKey?: string;

    @Column({ default: false })
    isVerified!: boolean;

    @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    @Column()
    userId!: string;

    @CreateDateColumn()
    addedAt!: Date;

    @Column('decimal', { default: 0, nullable: false })
    lastKnownBalance!: number;
}
