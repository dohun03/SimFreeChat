export class ResponseRoomDto {
  id: number;
  name: string;
  currentMembers?: number;
  maxMembers: number;
  password: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: number;
    name: string;
  };
}
