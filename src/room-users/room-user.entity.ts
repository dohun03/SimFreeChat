import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';

@Entity('room_users')
export class RoomUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Room, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'is_banned', type: 'boolean', default: false })
  isBanned: boolean;

  @Column({ name: 'ban_reason', type: 'varchar', length: 50, nullable: true })
  banReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
