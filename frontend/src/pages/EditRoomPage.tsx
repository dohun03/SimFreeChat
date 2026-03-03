import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPatch } from '../services/api';
import { useAuth } from '../providers/AuthProvider';

type Room = {
  id: number;
  name: string;
  maxMembers: number;
  owner: { id: number; name: string };
  password?: string | null;
};

export function EditRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet<Room>(`/api/rooms/${roomId}`);
        if (!r) return;
        if (!user || r.owner.id !== user.id) {
          setMsg('존재하지 않거나 접근할 수 없는 방입니다.');
          return;
        }
        setRoom(r);
        setName(r.name);
        setMaxMembers(String(r.maxMembers));
      } catch (e: any) {
        setMsg(e?.message || '방 정보를 가져올 수 없습니다.');
      }
    })();
  }, [roomId, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!name.trim() || !maxMembers) {
      setMsg('빈 칸을 입력하세요.');
      return;
    }
    try {
      await apiPatch(`/api/rooms/${roomId}`, {
        name: name.trim(),
        maxMembers: Number(maxMembers),
        password: password || undefined,
      });
      alert('방 정보가 변경되었습니다.');
      navigate(`/room/${roomId}`);
    } catch (e: any) {
      setMsg(e?.message || '방 수정 실패');
    }
  }

  async function removePassword() {
    if (!confirm('비밀번호를 해제하시겠습니까?')) return;
    try {
      await apiPatch(`/api/rooms/${roomId}`, { password: null });
      alert('비밀번호가 해제되었습니다.');
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || '비밀번호 해제 실패');
    }
  }

  async function deleteRoom() {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res: any = await apiGet(`/api/rooms/${roomId}`, { method: 'DELETE' });
      if (res?.message) alert(res.message);
      navigate('/');
    } catch (e: any) {
      setMsg(e?.message || '방 삭제 실패');
    }
  }

  if (msg && !room) return <div className="rounded-xl border border-slate-200 bg-white p-6">{msg}</div>;
  if (!room) return <div className="p-6 text-sm text-slate-600">로딩 중...</div>;

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-black text-center">채팅방 정보 수정</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">방 이름</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">최대인원</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            type="number"
            min={2}
            max={50}
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">비밀번호(선택)</label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={room.password ? '새 비밀번호를 입력하거나 해제' : '비밀번호'}
              type="password"
            />
            {room.password ? (
              <button
                type="button"
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-white"
                onClick={removePassword}
              >
                해제
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-black text-white">저장</button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-black text-white"
            onClick={deleteRoom}
          >
            삭제
          </button>
        </div>
      </form>
      {msg ? <p className="mt-3 text-sm font-bold text-rose-600">{msg}</p> : null}
    </div>
  );
}

