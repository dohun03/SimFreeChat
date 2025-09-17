import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChatEvents {
  constructor(private eventEmitter: EventEmitter2) {}

  leaveAllRooms(roomId: number, roomUserCount: number, user: any) {
    console.log('user 객체 테스트여', user);
    this.eventEmitter.emit('leaveAllRooms', { roomId, roomUserCount, user });
  }
}
