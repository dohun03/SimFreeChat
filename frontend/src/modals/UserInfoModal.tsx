import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { formatDate } from '../utils/format';
import { ModalLayout } from '../layout/ModalLayout';
import { X, Mail, Calendar, UserCheck, ShieldAlert } from 'lucide-react';

type UserInfoModalProps = {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  currentUserId: number;
  onKick?: (userId: number) => void;
  onBan?: (userId: number, reason: string) => void;
};

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export function UserInfoModal({ userId, isOpen, onClose, isOwner, currentUserId, onKick, onBan }: UserInfoModalProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      apiGet<User>(`/api/users/${userId}`)
        .then(setUser)
        .catch(() => setUser(null));
    } else {
      setUser(null);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <ModalLayout onClose={onClose}>
      {/* 우측 상단 X 버튼 절대 위치 보정 */}
      <button 
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-all" 
        onClick={onClose}
      >
        <X size={20} />
      </button>

      <div className="relative overflow-hidden pt-10 pb-8 px-6 text-center">
        {/* 프로필 아바타 배경 장식 */}
        <div className="absolute top-0 left-0 h-24 w-full bg-gradient-to-r from-blue-50 to-indigo-50" />
        
        <div className="relative mb-4 inline-flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white text-4xl shadow-xl shadow-blue-100 border-4 border-white">
          {user?.name?.[0].toUpperCase() || '👤'}
        </div>

        <h4 className="mb-1 text-xl font-black text-slate-900">{user?.name || 'Loading...'}</h4>
        <div className="mb-6 flex items-center justify-center gap-1 text-sm font-bold text-slate-400">
          <Mail size={14} />
          <span>{user?.email || 'email@address.com'}</span>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-3 text-left">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Calendar size={12} />
              가입 날짜
            </div>
            <div className="text-sm font-black text-slate-700">
              {user ? formatDate(user.createdAt) : '----.--.--'}
            </div>
          </div>
        </div>

        {/* 권한 액션 버튼 */}
        {isOwner && user && user.id !== currentUserId ? (
          <div className="space-y-2">
            <p className="mb-3 text-[10px] font-black text-rose-400 uppercase tracking-widest">Room Management</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-white py-3 text-sm font-black text-slate-900 hover:bg-slate-50 transition-all active:scale-95"
                onClick={() => {
                  if (confirm(`${user.name}님을 강퇴하시겠습니까?`)) {
                    onKick?.(user.id);
                    onClose();
                  }
                }}
              >
                <UserCheck size={16} /> 강퇴
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-black text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95"
                onClick={() => {
                  const reason = prompt('밴 사유를 입력하세요:');
                  if (reason) {
                    onBan?.(user.id, reason);
                    onClose();
                  }
                }}
              >
                <ShieldAlert size={16} /> 밴 처리
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-100 py-4 text-sm font-black text-slate-600 hover:bg-slate-200 transition-all"
          >
            닫기
          </button>
        )}
      </div>
    </ModalLayout>
  );
}