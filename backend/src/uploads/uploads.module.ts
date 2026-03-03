import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { RoomsModule } from 'src/rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
