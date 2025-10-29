// chat.service.ts 리턴 형식 정의.
interface UserSummary {
  id: number;
  name: string;
}

export interface JoinRoomResult {
  roomUsers: UserSummary[];
  afterCount: number;
  joinUser: UserSummary;
}

export interface LeaveRoomResult {
  roomUsers: UserSummary[];
  roomUserCount: number;
  leaveUser: UserSummary;
}

export interface KickUserResult {
  roomUsers: UserSummary[];
  roomUserCount: number;
  kickedUser: UserSummary;
}
