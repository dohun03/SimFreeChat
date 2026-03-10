import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Room } from 'src/rooms/rooms.entity';

@Entity('room_summaries')
export class RoomSummary {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'room_id', unique: true })
  roomId: number;

  @Column({ type: 'text', comment: 'AI로 요약된 대화 내용' })
  content: string;

  @Column({ name: 'last_message_id', type: 'varchar', length: 50, comment: '요약에 포함된 마지막 메시지 ID' })
  lastMessageId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;
}