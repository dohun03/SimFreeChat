import { useEffect, useState } from 'react';
import { UserCog, Loader2 } from 'lucide-react';
import { apiGet } from '../services/api';

export type RoomUser = {
  id: number;
  role: 'owner' | 'manager' | 'member';
  status: 'normal' | 'muted' | 'banned';
  user: { id: number; name: string };
};

export function RoomUserList({ roomId, onSelectUser }: { roomId: number, onSelectUser: (u: RoomUser) => void }) {
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiGet<RoomUser[]>(`/api/room-users/${roomId}`);
        setUsers(data ?? []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchUsers();
  }, [roomId]);

  const getRoleBadge = (role: string) => {
    if (role === 'owner') return <span className="text-[11px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black">방장</span>;
    if (role === 'manager') return <span className="text-[11px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-black">매니저</span>;
    return <span className="text-[11px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black">일반</span>;
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50/50 h-full">
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-tighter">참여자 목록</h3>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{users.length}명</span>
      </div>
      
      {users.map((u) => (
        <button 
          key={u.id} 
          onClick={() => onSelectUser(u)} 
          className="group flex items-center justify-between rounded-2xl p-4 bg-white hover:bg-indigo-50 transition-all border border-slate-100 shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 text-left">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm ${u.role === 'owner' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              {u.user.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[15px] font-black text-slate-800">{u.user.name}</span>
                {getRoleBadge(u.role)}
              </div>
              <span className={`text-[12px] font-bold ${u.status === 'normal' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {u.status === 'normal' ? '활동 중' : u.status === 'muted' ? '채팅 금지됨' : '차단됨'}
              </span>
            </div>
          </div>
          <UserCog size={20} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
        </button>
      ))}
    </div>
  );
}