import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('message_log')
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

  @Column({ name: 'action', length: 10 })
  action: 'SEND' | 'EDIT' | 'DELETE';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}