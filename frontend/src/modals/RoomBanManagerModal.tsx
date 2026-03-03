import { useEffect, useState } from 'react';
import { X, UserMinus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { apiDelete, apiGet } from '../services/api';
import { ModalLayout } from '../layout/ModalLayout';

type RoomUserBan = { id: number; user: { id: number; name: string }; banReason: string };

type BanManagerModalProps = {
  roomId: number;
  roomName: string;
  onClose: () => void;
};

export function RoomBanManagerModal({ roomId, roomName, onClose }: BanManagerModalProps) {
  const { user } = useAuth();
  const [bannedUsers, setBannedUsers] = useState<RoomUserBan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const bans = (await apiGet<RoomUserBan[]>(`/api/room-users/${roomId}`)) ?? [];
        setBannedUsers(bans);
      } catch (e) {
        console.error('밴 목록 로드 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  async function unban(targetUserId: number) {
    if (!confirm('정말 해제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/room-users/${roomId}/${targetUserId}`);
      setBannedUsers((prev) => prev.filter((u) => u.user.id !== targetUserId));
    } catch (e: any) {
      alert(e?.message || '해제 실패');
    }
  }

  return (
    <ModalLayout onClose={onClose}>
      
      {/* 모달 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-rose-500" />
          <h2 className="text-lg font-black text-slate-800">Banned Users</h2>
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      {/* 모달 본문 */}
      <div className="max-h-[60vh] overflow-y-auto p-5">
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Name</p>
          <p className="text-sm font-bold text-slate-700">{roomName}</p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm font-bold text-slate-400">Loading...</div>
        ) : bannedUsers.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-8 text-center">
            <p className="text-sm font-bold text-slate-400">차단된 사용자가 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bannedUsers.map((u) => (
              <li key={u.user.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-800">{u.user.name}</div>
                  <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                    Reason: {u.banReason || 'No reason provided'}
                  </div>
                </div>
                <button 
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-600 hover:bg-amber-100 transition-colors"
                  onClick={() => unban(u.user.id)}
                >
                  <UserMinus size={14} />
                  <span>Unban</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 모달 푸터 */}
      <div className="border-t border-slate-50 p-4 bg-slate-50/50">
        <button 
          onClick={onClose}
          className="w-full rounded-xl bg-white border border-slate-200 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 transition-all"
        >
          Close
        </button>
      </div>
    </ModalLayout>
  );
}