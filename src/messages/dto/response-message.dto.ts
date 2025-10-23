export class ResponseMessageDto {
  id: number;
  content: string;
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