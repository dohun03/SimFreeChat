import { useEffect, useState } from 'react';
import { X, ShieldAlert, ShieldCheck, VolumeX, Ban, UserCog, Check, RotateCcw } from 'lucide-react';
import { apiGet, apiPatch, apiDelete, apiPost } from '../services/api';
import { ModalLayout } from '../layout/ModalLayout';

type UserRole = 'owner' | 'manager' | 'member';
type UserStatus = 'normal' | 'muted' | 'banned';

type RoomUser = {
  id: number;
  role: UserRole;
  status: UserStatus;
  restrictedUntil: string | null;
  banReason: string | null;
  user: { id: number; name: string };
};

export function RoomManagementModal({ roomId, roomName, onClose }: { roomId: number; roomName: string; onClose: () => void }) {
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [roomId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // 백엔드: GET /room-users/:roomId 호출
      const data = await apiGet<RoomUser[]>(`/room-users/${roomId}`);
      setUsers(data ?? []);
    } catch (e) {
      console.error('유저 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // 1. 권한 변경 (Manager 부여/해제)
  const handleUpdateRole = async (targetUserId: number, currentRole: UserRole) => {
    const newRole = currentRole === 'manager' ? 'member' : 'manager';
    if (!confirm(`권한을 ${newRole === 'manager' ? '매니저' : '일반 멤버'}로 변경하시겠습니까?`)) return;
    
    try {
      // 백엔드: PATCH /room-users/role (예시 주소, 필요시 컨트롤러 확인)
      await apiPatch(`/room-users/${roomId}/role`, { targetUserId, role: newRole });
      fetchUsers();
    } catch (e: any) { alert(e.message); }
  };

  // 2. 제재 적용 (Mute / Ban)
  const handleRestrict = async (targetUserId: number, status: UserStatus) => {
    const reason = prompt(`${status === 'banned' ? '밴' : '뮤트'} 사유를 입력하세요:`, '관리자 조치');
    if (reason === null) return; // 취소 클릭 시

    try {
      // 백엔드 restrictUser 스펙: { status, days, reason }
      // 일단 임시로 7일(7) 혹은 영구(9999) 처리
      const days = status === 'banned' ? 9999 : 7;
      
      // Gateway나 Controller에서 @Post(':roomId/restrict') 등으로 연결되어 있어야 함
      // 여기서는 서비스 로직 구조에 맞게 전송
      await apiPost(`/room-users/${roomId}/restrict`, { 
        targetUserId, 
        status, 
        days, 
        reason 
      });
      fetchUsers();
    } catch (e: any) { alert(e.message); }
  };

  // 3. 제재 해제 (Normal로 복구)
  const handleUnrestrict = async (targetUserId: number) => {
    if (!confirm('모든 제재를 해제하고 정상 상태로 돌리겠습니까?')) return;
    try {
      // 백엔드: DELETE /room-users/:roomId/:targetUserId (unrestrictUser 메서드)
      await apiDelete(`/room-users/${roomId}/${targetUserId}`);
      fetchUsers();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <ModalLayout onClose={onClose}>
      <div className="flex w-[640px] flex-col bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b p-6 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2 text-white shadow-lg">
              <UserCog size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">멤버 관리</h2>
              <p className="text-sm font-bold text-slate-400">{roomName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-200 transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* 본문 리스트 */}
        <div className="h-[450px] overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex h-full items-center justify-center font-bold text-slate-300 animate-pulse">데이터 로딩 중...</div>
          ) : users.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-300">
              <ShieldCheck size={64} className="mb-2 opacity-10" />
              <p className="font-bold uppercase tracking-widest">No Members</p>
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 bg-white hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner
                    ${u.role === 'owner' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {u.user.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800">{u.user.name}</span>
                      {u.role === 'owner' && <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white">OWNER</span>}
                      {u.role === 'manager' && <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 text-[10px] font-black text-white">MANAGER</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                        ${u.status === 'normal' ? 'border-emerald-200 text-emerald-500 bg-emerald-50' : 
                          u.status === 'muted' ? 'border-orange-200 text-orange-500 bg-orange-50' : 
                          'border-rose-200 text-rose-500 bg-rose-50'}`}>
                        {u.status.toUpperCase()}
                      </span>
                      {u.status !== 'normal' && (
                        <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                          사유: {u.banReason || '없음'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 관리 버튼 세트 */}
                <div className="flex items-center gap-2">
                  {u.role !== 'owner' && (
                    <>
                      {/* 매니저 임명/해제 */}
                      <button 
                        onClick={() => handleUpdateRole(u.user.id, u.role)}
                        className={`p-2.5 rounded-xl transition-all ${u.role === 'manager' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                        title="권한 변경"
                      >
                        <ShieldAlert size={18} />
                      </button>

                      {u.status === 'normal' ? (
                        <>
                          <button 
                            onClick={() => handleRestrict(u.user.id, 'muted')}
                            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all"
                            title="뮤트"
                          >
                            <VolumeX size={18} />
                          </button>
                          <button 
                            onClick={() => handleRestrict(u.user.id, 'banned')}
                            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                            title="차단"
                          >
                            <Ban size={18} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleUnrestrict(u.user.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all"
                        >
                          <RotateCcw size={14} /> 해제
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t bg-slate-50 p-6">
          <button onClick={onClose} className="w-full rounded-2xl bg-slate-900 py-4 font-black text-white hover:bg-slate-800 active:scale-[0.98] shadow-xl transition-all">
            설정 완료
          </button>
        </div>
      </div>
    </ModalLayout>
  );
}