import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SocketEvents {
  constructor(private eventEmitter: EventEmitter2) {}

  leaveAllRooms(payload: { roomId: number, roomUserCount: number, roomUsers: any, deletedUser: any }) {
    this.eventEmitter.emit('room.user.leftAll', payload);
  }

  updateRoom(payload: { roomId: number, room: any }) {
    this.eventEmitter.emit('room.info.update', payload);
  }

  deleteRoom(payload: { roomId: number, userId: number }) {
    this.eventEmitter.emit('room.delete', payload);
  }

  restrictUser(payload: { roomId: number, targetUserId: number, status: string, reason: string, until: Date }) {
    this.eventEmitter.emit('room.user.restricted', payload);
  }

  // 제재 해제 알림 전용 버튼
  unrestrictUser(payload: { roomId: number, targetUserId: number }) {
    this.eventEmitter.emit('room.user.unrestricted', payload);
  }
}
