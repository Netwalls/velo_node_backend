import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ type: 'varchar', length: 64, nullable: true })
  chain: string | undefined;

  @Column({ type: 'varchar', length: 32, nullable: true })
  network: string | undefined;

  @Column({ type: 'varchar', length: 128, nullable: true })
  address: string | undefined;

  @Column({ type: 'text', nullable: true })
  encryptedPrivateKey?: string;

  @ManyToOne(() => User, (user) => (user as any).addresses)
  @JoinColumn()
  user: User | undefined;

  @Column({ type: 'uuid', nullable: true })
  userId: string | undefined;
}
