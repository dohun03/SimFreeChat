import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!name.trim() || !maxMembers) {
      setMsg('빈 칸을 입력하세요.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      maxMembers: Number(maxMembers),
      password: password || undefined,
    };

    try {
      const room: any = await apiPost('/api/rooms', payload);
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      setMsg(err?.message || '방 생성 실패');
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-black text-center">채팅방 생성</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">방 이름</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="방 이름 입력"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">최대인원</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            placeholder="최대 인원 입력"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">비밀번호(선택)</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            type="password"
          />
        </div>
        <button className="w-full rounded-lg bg-slate-900 py-2 text-sm font-black text-white">방 생성</button>
      </form>
      {msg ? <p className="mt-3 text-sm font-bold text-rose-600">{msg}</p> : null}
    </div>
  );
}

