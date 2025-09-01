import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique, JoinColumn } from 'typeorm';
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

  @Column({ default: false })
  is_banned: boolean;

  @Column({ default: false })
  is_muted: boolean;

  @CreateDateColumn()
  joined_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
