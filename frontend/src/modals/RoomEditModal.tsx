import { FormEvent, useEffect, useState } from 'react';
import { X, Settings2, Trash2, Key, Users, Save } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { apiDelete, apiGet, apiPatch } from '../services/api';
import { ModalLayout } from '../layout/ModalLayout';

type Room = {
  id: number;
  name: string;
  maxMembers: number;
  owner: { id: number; name: string };
  password?: string | null;
};

type RoomEditModalProps = {
  roomId: number;
  onClose: () => void;
  onUpdated?: () => void; // 정보 수정 후 채팅방 정보를 새로고침하기 위한 콜백
};

export function RoomEditModal({ roomId, onClose, onUpdated }: RoomEditModalProps) {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await apiGet<Room>(`/api/rooms/${roomId}`);
        if (!r || !user || r.owner.id !== user.id) {
          setMsg('권한이 없거나 존재하지 않는 방입니다.');
          return;
        }
        setRoom(r);
        setName(r.name);
        setMaxMembers(String(r.maxMembers));
      } catch (e: any) {
        setMsg(e?.message || '정보를 로드할 수 없습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!name.trim() || !maxMembers) {
      setMsg('필수 항목을 입력하세요.');
      return;
    }
    try {
      await apiPatch(`/api/rooms/${roomId}`, {
        name: name.trim(),
        maxMembers: Number(maxMembers),
        password: password || undefined,
      });
      alert('방 정보가 수정되었습니다.');
      onUpdated?.();
      onClose();
    } catch (e: any) {
      setMsg(e?.message || '수정 실패');
    }
  }

  async function removePassword() {
    if (!confirm('비밀번호를 해제하시겠습니까?')) return;
    try {
      await apiPatch(`/api/rooms/${roomId}`, { password: null });
      alert('비밀번호가 해제되었습니다.');
      setPassword('');
      const r = await apiGet<Room>(`/api/rooms/${roomId}`);
      if (r) setRoom(r);
    } catch (e: any) {
      setMsg(e?.message || '해제 실패');
    }
  }

  async function deleteRoom() {
    if (!confirm('방을 삭제하면 모든 대화가 사라집니다.\n정말 삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/rooms/${roomId}`);
      alert('방이 삭제되었습니다.');
      window.location.href = '/';
    } catch (e: any) {
      setMsg(e?.message || '삭제 실패');
    }
  }

  if (loading) return null;

  return (
    <ModalLayout onClose={onClose}>
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <Settings2 size={20} className="text-slate-900" />
            <h2 className="text-lg font-black text-slate-800">Room Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 */}
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* 방 이름 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase">
              Room Name
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-400 focus:bg-white transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="방 이름을 입력하세요"
            />
          </div>

          {/* 최대 인원 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase">
              <Users size={14} /> Max Members
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-400 focus:bg-white transition-all"
              type="number"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase">
              <Key size={14} /> Password (Optional)
            </label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-400 focus:bg-white transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={room?.password ? '••••••' : '비밀번호 설정'}
                type="password"
              />
              {room?.password && (
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-100 transition-colors"
                  onClick={removePassword}
                >
                  해제
                </button>
              )}
            </div>
          </div>

          {msg && <p className="text-xs font-bold text-rose-600 animate-pulse">{msg}</p>}

          {/* 버튼 영역 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={deleteRoom}
              className="flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
              title="Delete Room"
            >
              <Trash2 size={18} />
            </button>
            <button 
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-lg"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </ModalLayout>
  );
}