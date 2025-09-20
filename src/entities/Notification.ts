import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';
import { NotificationType } from '../types';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type!: NotificationType;

    @Column('text')
    title!: string;

    @Column('text')
    message!: string;

    @Column('jsonb', { nullable: true })
    details?: any;

    @Column({ default: false })
    isRead!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
