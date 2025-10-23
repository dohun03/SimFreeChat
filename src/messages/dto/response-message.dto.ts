export class ResponseMessageDto {
  id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
  user: {
    id: number;
    name: string;
    is_admin: boolean;
    is_banned: boolean;
    created_at: Date;
    updated_at: Date;
  };
}