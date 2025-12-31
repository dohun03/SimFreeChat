export class ResponseMessageDto {
  id: number;
  content: string;
  type: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    name: string;
    isAdmin: boolean;
    isBanned: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}