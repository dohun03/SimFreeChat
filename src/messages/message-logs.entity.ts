import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { MessageType } from '../messages/messages.entity';

@Entity('message_log')

// 기본정렬 & 페이징
@Index('idx_created_at_id', ['createdAt', 'id'])

// 메타 데이터 & 필터
@Index('idx_room_id', ['roomId'])
@Index('idx_user_id', ['userId'])
@Index('idx_room_owner_id', ['roomOwnerId'])

// 타입 검색
@Index('idx_action', ['action'])
@Index('idx_type', ['type'])

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
