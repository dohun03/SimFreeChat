export class ResponseMessageDto {
  id: string;
  content: string;
  type: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    id: number;
    name: string;
    isAdmin: boolean;
  };
}