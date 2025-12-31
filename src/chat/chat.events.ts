import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChatEvents {
  constructor(private eventEmitter: EventEmitter2) {}

  leaveAllRooms(roomId: number, roomUserCount: number, roomUsers: any, deletedUser: any) {
    this.eventEmitter.emit('leaveAllRooms', { roomId, roomUserCount, roomUsers, deletedUser });
  }

  updateRoom(roomId: number, room: any) {
    this.eventEmitter.emit('updateRoom', { roomId, room });
  }

  deleteRoom(roomId: number, userId: number) {
    this.eventEmitter.emit('deleteRoom', { roomId, userId });
  }
}
