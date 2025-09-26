import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChatEvents {
  constructor(private eventEmitter: EventEmitter2) {}

  leaveAllRooms(roomId: number, roomUserCount: number, user: any) {
    this.eventEmitter.emit('leaveAllRooms', { roomId, roomUserCount, user });
  }
}
