import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';
import { ChainType } from '../types';

@Entity('user_addresses')
export class UserAddress {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: 'enum',
        enum: ChainType,
    })
    chain!: ChainType;

    @Column('text')
    address!: string;

    @Column({ default: false })
    isVerified!: boolean;

    @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    @Column()
    userId!: string;

    @CreateDateColumn()
    addedAt!: Date;
}
