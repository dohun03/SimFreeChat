import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { MessageType } from '../messages/messages.entity';

@Entity('message_log')
@Index('idx_message_content_fulltext', ['messageContent'], { fulltext: true })
@Index('idx_action_created_at', ['action', 'createdAt'])
@Index('idx_room_name_fulltext', ['roomName'], { fulltext: true })
@Index('idx_user_name_fulltext', ['userName'], { fulltext: true })
export class MessageLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_id' })
  roomId: number;

  @Column({ name: 'room_name', length: 100 })
  roomName: string;

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
