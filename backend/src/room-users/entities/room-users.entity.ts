import { Room } from 'src/rooms/entities/rooms.entity';
import { User } from 'src/users/entities/users.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';

export enum RoomUserRole {
  OWNER = 'owner',     // 방장
  MANAGER = 'manager', // 부방장
  MEMBER = 'member',   // 일반 유저
}

export enum RoomUserStatus {
  NORMAL = 'normal',   // 정상
  MUTED = 'muted',     // 뮤트
  BANNED = 'banned',   // 밴 (영구/기간 공용)
}

@Entity('room_users')
@Index(['room', 'user'], { unique: true })
export class RoomUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Room, (room) => room.roomUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User, (user) => user.roomUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: RoomUserRole,
    default: RoomUserRole.MEMBER
  })
  role: RoomUserRole;

  @Column({
    type: 'enum',
    enum: RoomUserStatus,
    default: RoomUserStatus.NORMAL
  })
  status: RoomUserStatus;

  @Column({ name: 'restricted_until', type: 'datetime', nullable: true })
  restrictedUntil: Date | null;

  @Column({ name: 'ban_reason', type: 'varchar', length: 255, nullable: true })
  banReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
