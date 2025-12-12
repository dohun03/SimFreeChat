import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { MessageType } from '../messages/messages.entity';

@Entity('message_log')

// action, type은 COUNT 최적화 용도
@Index('idx_master_action_master', ['action', 'createdAt','id'])
@Index('idx_master_type_master', ['type', 'createdAt','id'])
@Index('idx_master_room', ['roomId', 'createdAt', 'id'])
@Index('idx_master_user', ['userId', 'createdAt', 'id'])

export class MessageLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_id' })
  roomId: number;

  @Column({ name: 'room_name', length: 100 })
  roomName: string;

  @Column({ name: 'room_owner_id' })
  roomOwnerId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'user_name', length: 50 })
  userName: string;

  @Column({ name: 'message_id' })
  messageId: number;

  @Column({ name: 'message_content', type: 'text', nullable: true })
  messageContent: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ name: 'action', length: 10 })
  action: 'SEND' | 'EDIT' | 'DELETE';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
