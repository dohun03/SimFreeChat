import { useState } from 'react';
import { ShieldAlert, MessageSquareOff, Ban, RotateCcw, ArrowLeft, ShieldCheck, Clock, AlignLeft } from 'lucide-react';
import { apiDelete, apiPatch } from '../../services/api'; // 해제는 API로 가정
import { RoomUser } from '../RoomUserList';
import { useAuth } from '../../providers/AuthProvider';

export function RoomUserManagement({ 
  roomId, 
  user, 
  onBack,
  socket // 부모로부터 소켓 인스턴스를 전달받는다고 가정
}: { 
  roomId: number, 
  user: RoomUser, 
  onBack: () => void,
  socket: any 
}) {
  const { user: currentUser } = useAuth();
  const [duration, setDuration] = useState('1h');
  const [reason, setReason] = useState('');

  // 권한 체크: 본인, 방장, 서버관리자(admin)는 제재 대상에서 제외
  const isSelf = currentUser?.id === user.user.id;
  const isOwner = user.role === 'owner';
  const isAdmin = (user.user as any).role === 'admin'; // 서버 관리자 여부
  const canNotModerate = isSelf || isOwner || isAdmin;

  // 1. 권한 변경 (매니저 등록/해제) - 이건 보통 API가 안정적
  const handleUpdateRole = async () => {
    const isToManager = user.role !== 'manager';
    if (!confirm(`해당 사용자를 ${isToManager ? '매니저로 등록' : '일반 사용자로 강등'}하시겠습니까?`)) return;
    try {
      await apiPatch(`/api/room-users/${roomId}/role`, { 
        targetUserId: user.user.id, 
        role: isToManager ? 'manager' : 'member' 
      });
      onBack();
    } catch (e: any) { alert(e.message); }
  };

  // 2. 뮤트 처리 (소켓)
  const handleMute = () => {
    if (!reason.trim()) return alert('뮤트 사유를 입력해주세요.');
    socket.emit('mute_user', { roomId, targetUserId: user.user.id, duration, reason });
    alert('뮤트 요청을 보냈습니다.');
    onBack();
  };

  // 3. 밴 처리 (소켓)
  const handleBan = () => {
    if (!reason.trim()) return alert('밴 사유를 입력해주세요.');
    if (!confirm('정말로 이 사용자를 차단하시겠습니까?')) return;
    socket.emit('ban_user', { roomId, targetUserId: user.user.id, duration, reason });
    alert('밴 요청을 보냈습니다.');
    onBack();
  };

  // 4. 해제 처리 (API 혹은 소켓)
  const handleUnrestrict = async () => {
    if (!confirm('제재를 해제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/room-users/${roomId}/unrestrict/${user.user.id}`);
      onBack();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right duration-200">
      {/* 헤더 영역 */}
      <div className="p-6 bg-white border-b border-slate-200 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-6 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm font-black text-slate-600">목록으로 돌아가기</span>
        </button>

        <div className="flex flex-col items-center">
          {/* 각도 똑바로 돌려놓음 (rotate-0) */}
          <div className="h-24 w-24 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center text-4xl font-black mb-4 shadow-xl rotate-0">
            {user.user.name[0]}
          </div>
          <h3 className="text-2xl font-black text-slate-800">{user.user.name}</h3>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{user.role}</p>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto">
        {/* 권한 관리 (본인 제외) */}
        {!isSelf && (
          <section>
            <p className="text-[11px] font-black text-slate-400 mb-3 ml-1 uppercase tracking-tighter">권한 설정</p>
            <button onClick={handleUpdateRole} className="w-full flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <ShieldCheck size={24} className="text-indigo-500" />
                <span className="font-black text-[15px]">{user.role === 'manager' ? '매니저 권한 해제' : '매니저로 임명'}</span>
              </div>
            </button>
          </section>
        )}

        {/* 제재 관리 섹션 */}
        <section className="space-y-4">
          <p className="text-[11px] font-black text-slate-400 mb-3 ml-1 uppercase tracking-tighter">이용 제한 관리</p>
          
          {canNotModerate ? (
            <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 text-center">
              <p className="text-sm font-bold text-slate-500">이 사용자는 제재할 수 없습니다.</p>
            </div>
          ) : user.status === 'normal' ? (
            <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              {/* 시간 설정 */}
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Clock size={18} className="text-slate-400" />
                <select 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)}
                  className="flex-1 bg-transparent font-bold text-slate-700 text-sm focus:outline-none"
                >
                  <option value="1h">1시간 동안</option>
                  <option value="1d">1일 동안</option>
                  <option value="7d">7일 동안</option>
                  <option value="999y">영구적으로</option>
                </select>
              </div>

              {/* 사유 입력 */}
              <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <AlignLeft size={16} />
                  <span className="text-[11px] font-black uppercase">제재 사유 입력</span>
                </div>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="사유를 상세히 적어주세요..."
                  className="w-full h-20 bg-transparent text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={handleMute} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all text-orange-600 font-black shadow-sm shadow-orange-100">
                  <MessageSquareOff size={24} />
                  <span className="text-xs">채팅 금지</span>
                </button>
                <button onClick={handleBan} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all text-rose-600 font-black shadow-sm shadow-rose-100">
                  <Ban size={24} />
                  <span className="text-xs">접속 차단</span>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleUnrestrict} className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all">
              <RotateCcw size={24} /> 현재 제재 해제하기
            </button>
          )}
        </section>
      </div>
    </div>
  );
}