import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    @Column()
    type!: string; // e.g. 'swap', 'deposit', 'withdrawal', etc.

    @Column('jsonb', { nullable: true })
    details?: any;

    @CreateDateColumn()
    createdAt!: Date;
}
