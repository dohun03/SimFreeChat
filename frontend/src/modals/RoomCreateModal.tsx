import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, PlusCircle, Key, Users, MessageSquarePlus } from 'lucide-react';
import { apiGet, apiPost } from '../services/api';
import { ModalLayout } from '../layout/ModalLayout';

type RoomCreateModalProps = {
  onClose: () => void;
};

export function RoomCreateModal({ onClose }: RoomCreateModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!name.trim() || !maxMembers) {
      setMsg('방 이름과 최대 인원을 입력해주세요.');
      return;
    }
    setLoading(true);

    try {
      const room: any = await apiPost('/api/rooms', {
        name: name.trim(),
        maxMembers: Number(maxMembers),
        password: password || undefined,
      });
      
      onClose();
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      setMsg(err?.message || '방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    // 2. ModalLayout으로 감싸기 (배경, 포털, 애니메이션 자동 적용)
    <ModalLayout onClose={onClose}>
      
      {/* 모달 헤더: 레이아웃 내부의 자식(children)으로 들어감 */}
      <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200">
            <PlusCircle size={22} />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">새 대화방 생성</h2>
        </div>
        <button 
          onClick={onClose} 
          className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-all active:scale-90"
        >
          <X size={24} strokeWidth={3} />
        </button>
      </div>

      {/* 모달 본문 */}
      <form onSubmit={onSubmit} className="p-8 space-y-6">
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider">
            Room Name
          </label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-base font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="방 이름을 지어주세요"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider">
              <Users size={14} /> Max Capacity
            </label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-base font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
              type="number"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider">
              <Key size={14} /> Password
            </label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-base font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="공개 방"
              type="password"
            />
          </div>
        </div>

        {msg && (
          <div className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
            {msg}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-blue-600 py-4.5 text-lg font-black text-white hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95"
        >
          {loading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <MessageSquarePlus size={22} />
              대화방 만들기
            </>
          )}
        </button>
      </form>
    </ModalLayout>
  );
}