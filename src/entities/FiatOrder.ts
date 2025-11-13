import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('fiat_orders')
export class FiatOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string | undefined;

    @Column({ nullable: true, unique: true })
    orderId?: string;

    @Column({ nullable: true, unique: true })
    externalOrderId?: string;

    @Column({ nullable: true })
    userId?: string;

    @Column({ nullable: true })
    providerCode?: string;

    @Column({ nullable: true })
    currencyFrom?: string;

    @Column({ nullable: true })
    currencyTo?: string;

    @Column('decimal', { precision: 24, scale: 8, nullable: true })
    amountFrom?: number;

    @Column({ nullable: true })
    status?: string;

    @Column({ type: 'json', nullable: true })
    rawResponse?: any;

    @CreateDateColumn()
    createdAt: Date | undefined;

    @UpdateDateColumn()
    updatedAt: Date | undefined;
}

export default FiatOrder;
