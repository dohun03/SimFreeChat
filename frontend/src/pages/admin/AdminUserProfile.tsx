import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPatch, apiPost, apiDelete } from '../../services/api';
import { formatDate } from '../../utils/format';
import { 
  User, Mail, Calendar, ShieldCheck, 
  Ban, Trash2, ChevronLeft, Save, Unlock, Lock 
} from 'lucide-react';

export function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // 수정용 폼 상태 (비밀번호 추가)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '', // 비밀번호 추가
  });

  // 차단 설정 상태 (밴 사유 추가)
  const [banDays, setBanDays] = useState<number | "">(""); 
    const [banReason, setBanReason] = useState('');

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/users/${userId}`);
      setUserData(res);
      setForm({
        name: res.name,
        email: res.email,
        password: '', // 초기값은 비워둠
      });
      
      if (res.bannedUntil) {
        const until = new Date(res.bannedUntil);
        const now = new Date();

        if (until > now) {
          if (until.getFullYear() >= 2099) {
            setBanDays(9999);
          } else {
            const diffDays = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) setBanDays(1);
            else if (diffDays <= 7) setBanDays(7);
            else setBanDays(30);
          }
        } else {
          setBanDays("");
        }
      } else {
        setBanDays("");
      }
      
      setBanReason(res.banReason || '');
    } catch (err) {
      alert('유저 정보를 불러오는데 실패했습니다.');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  const handleUpdate = async () => {
    if (!confirm('유저 정보를 수정하시겠습니까?')) return;

    const payload: any = {};

    if (form.name !== userData.name) {
      payload.name = form.name;
    }
    if (form.email !== userData.email) {
      payload.email = form.email;
    }
    if (form.password) {
      payload.password = form.password;
    }

    if (Object.keys(payload).length === 0) {
      alert('변경사항이 없습니다.');
      setEditMode(false);
      return;
    }

    try {
      await apiPatch(`/api/users/${userId}`, payload);
      alert('수정되었습니다.');
      
      setEditMode(false);
      fetchUser(); 
    } catch (err: any) {
      alert(err.message || '수정 중 오류 발생');
    }
  };

  // 유저 차단 (Ban 사유 포함)
  const handleBan = async () => {
    if (!banDays) return alert('밴 기간을 선택해 주세요.');
    if (!banReason) return alert('밴 사유를 입력해 주세요.');

    try {
      await apiPost(`/api/users/${userId}/ban`, { 
        banDays: Number(banDays),
        reason: banReason 
      });
      alert('차단 처리되었습니다.');
      fetchUser();
    } catch (err: any) {
      alert(err.message || '차단 중 오류 발생');
    }
  };

  // 차단 해제 (Unban)
  const handleUnban = async () => {
    if (!confirm('이 유저의 차단을 해제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/users/${userId}/ban`);
      alert('차단이 해제되었습니다.');
      fetchUser();
    } catch (err: any) {
      alert(err.message || '차단 해제 중 오류 발생');
    }
  };

  // 유저 삭제 (Delete)
  const handleDelete = async () => {
    if (!confirm('정말로 이 유저를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    try {
      await apiDelete(`/api/users/${userId}`);
      alert('유저가 삭제되었습니다.');
      navigate('/admin/users');
    } catch (err: any) {
      alert(err.message || '삭제 중 오류 발생');
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-slate-400">유저 정보를 불러오는 중...</div>;

  const isCurrentlyBanned = userData.bannedUntil && new Date(userData.bannedUntil) > new Date();
  const isPermanent = userData.bannedUntil && new Date(userData.bannedUntil).getFullYear() >= 2099;

  return (
    <div className="mx-auto mt-12 mb-10 max-w-4xl px-4 animate-in fade-in duration-500 font-sans">
      <button 
        onClick={() => navigate('/admin/users')}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft size={18} /> 유저 목록으로 돌아가기
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 왼쪽: 프로필 요약 카드 */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <User size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900">{userData.name}</h3>
            <p className="text-sm font-medium text-slate-500 mb-4">{userData.email}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {userData.isAdmin && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-600">ADMIN</span>
              )}
              {isCurrentlyBanned ? (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black text-rose-600">
                  {isPermanent ? 'PERMANENT BANNED' : 'BANNED'}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-600">ACTIVE</span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-400" size={18} />
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase">가입 일시</p>
                <p className="text-sm font-bold text-slate-700">{formatDate(userData.createdAt)}</p>
              </div>
            </div>
            {isCurrentlyBanned && (
              <div className="flex items-center gap-3">
                <Ban className="text-rose-400" size={18} />
                <div>
                  <p className="text-[11px] font-black text-rose-400 uppercase">차단 종료일</p>
                  <p className="text-sm font-bold text-rose-700">
                    {isPermanent ? '영구 차단' : formatDate(userData.bannedUntil)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 상세 설정 */}
        <div className="md:col-span-2 space-y-6">
          
          {/* 기본 정보 및 비밀번호 수정 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-blue-500" size={20} /> 프로필 설정
              </h4>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="text-xs font-black text-blue-600 hover:underline"
              >
                {editMode ? '취소' : '수정하기'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1 ml-1">이름</label>
                  <input 
                    disabled={!editMode}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1 ml-1">이메일</label>
                  <input 
                    disabled={!editMode}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>
              </div>

              {/* 비밀번호 변경 칸 추가 */}
              <div>
                <label className="block text-xs font-black text-slate-400 mb-1 ml-1">새 비밀번호 (변경 시에만 입력)</label>
                <div className="relative">
                  <input 
                    type="password"
                    disabled={!editMode}
                    placeholder={editMode ? "변경할 비밀번호를 입력하세요" : "••••••••"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                </div>
              </div>

              {editMode && (
                <button 
                  onClick={handleUpdate}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 transition-all"
                >
                  <Save size={18} /> 프로필 저장
                </button>
              )}
            </div>
          </div>

          {/* 계정 밴 관리 섹션 (사유 입력 추가) */}
          <div className="rounded-3xl border border-rose-100 bg-rose-50/30 p-8 shadow-sm">
            <h4 className="text-lg font-black text-rose-900 flex items-center gap-2 mb-6">
              <Ban className="text-rose-500" size={20} /> 밴 / 제재 설정
            </h4>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-rose-400 mb-1 ml-1">밴 기간</label>
                  <select 
                    value={banDays}
                    onChange={e => setBanDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none" 
                  >
                    <option value="" disabled>-- 밴 기간 선택 --</option>
                    <option value={1}>1일 정지</option>
                    <option value={7}>7일 정지</option>
                    <option value={30}>30일 정지</option>
                    <option value={9999}>영구 정지</option>
                  </select>
                </div>
                {/* 밴 사유 입력칸 추가 */}
                <div>
                  <label className="block text-xs font-black text-rose-400 mb-1 ml-1">밴 사유</label>
                  <input 
                    placeholder="사유를 입력하세요"
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {isCurrentlyBanned ? (
                  <>
                    <button 
                      onClick={handleBan}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-white hover:bg-amber-600 transition-all"
                    >
                      밴 정보 수정
                    </button>
                    <button 
                      onClick={handleUnban}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border border-rose-200 px-6 py-3 text-sm font-black text-rose-600 hover:bg-rose-100 transition-all"
                    >
                      <Unlock size={18} /> 차단 해제
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleBan}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-black text-white hover:bg-rose-700 transition-all"
                  >
                    <Ban size={18} /> 계정 밴 하기
                  </button>
                )}
              </div>

              <hr className="border-rose-100 my-2" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-rose-900">영구 계정 삭제</p>
                  <p className="text-xs font-medium text-rose-400">복구가 불가능합니다.</p>
                </div>
                <button 
                  onClick={handleDelete}
                  className="flex items-center gap-2 rounded-xl bg-rose-100 px-6 py-3 text-sm font-black text-rose-600 hover:bg-rose-200 transition-all"
                >
                  <Trash2 size={18} /> 유저 삭제
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}