import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, JoinColumn, PrimaryColumn } from 'typeorm';
import { Room } from '../rooms/rooms.entity';
import { User } from '../users/users.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

@Entity()
@Index('idx_master_room', ['room', 'id'])
export class Message {
  @PrimaryColumn({
    type: 'bigint',
  })
  id: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ 
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
    default: null
  })
  updatedAt: Date;
}
