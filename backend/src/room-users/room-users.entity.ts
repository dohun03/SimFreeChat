import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique, JoinColumn, } from 'typeorm';
import { Room } from '../rooms/rooms.entity';
import { User } from '../users/users.entity';

export enum Role {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

@Entity()
@Unique(['room', 'user'])
export class RoomUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;

  @Column({ name: 'is_banned', default: false })
  isBanned: boolean;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
