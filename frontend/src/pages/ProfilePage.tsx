import { FormEvent, useState } from 'react';
import { apiPatch } from '../services/api'; // 아까 만든 apiPatch 사용
import { useAuth } from '../providers/AuthProvider';
import { 
  User, Mail, Lock, ShieldCheck, 
  Calendar, Clock, Save, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { formatDate } from '../utils/format';

export function ProfilePage() {
  const { user, reload } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (password && password !== confirmPassword) {
      setMsg({ text: '비밀번호가 일치하지 않습니다.', type: 'error' });
      return;
    }

    const payload: any = {};
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (password) payload.password = password;

    if (Object.keys(payload).length === 0) {
      setMsg({ text: '수정할 내용을 입력해주세요.', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      // 아까 만든 apiPatch 활용 (JSON.stringify 생략 가능해서 훨씬 깔끔)
      await apiPatch('/api/users/me', payload);

      setMsg({ text: '프로필 정보가 성공적으로 변경되었습니다.', type: 'success' });
      await reload();

      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ text: err?.message || '저장 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-12 mb-10 max-w-4xl px-4 animate-in fade-in duration-500 font-sans">
      {/* 상단 헤더 영역 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">내 프로필</h1>
        <p className="mt-2 text-sm font-bold text-slate-400">회원님의 개인 정보와 보안 설정을 관리하세요.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* 왼쪽: 현재 정보 요약 카드 (관리자 상세페이지와 디자인 통일) */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <User size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900">{user.name}</h3>
            <p className="text-sm font-medium text-slate-500 mb-4">{user.email}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {user.isAdmin ? (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black text-indigo-600">ADMIN ACCOUNT</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">STANDARD USER</span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-400" size={18} />
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase">가입 일자</p>
                <p className="text-sm font-bold text-slate-700">{formatDate(user.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-50 pt-4">
              <Clock className="text-slate-400" size={18} />
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase">최근 업데이트</p>
                <p className="text-sm font-bold text-slate-700">
                  {user.updatedAt ? formatDate(user.updatedAt) : '기록 없음'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 수정 폼 */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h4 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
              <ShieldCheck className="text-indigo-500" size={20} /> 계정 정보 수정
            </h4>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 ml-1">이름 변경</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-5 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                      placeholder={user.name}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 ml-1">이메일 변경</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-5 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                      placeholder={user.email}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="h-[1px] w-full bg-slate-50 my-2" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 ml-1">새 비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-5 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 ml-1">비밀번호 확인</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-5 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-black text-white hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Save size={18} /> 설정 저장하기
                  </>
                )}
              </button>
            </form>

            {msg.text && (
              <div className={`mt-6 flex items-center gap-2 rounded-2xl p-4 text-sm font-bold border animate-in slide-in-from-top-2 duration-300 ${
                msg.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-500' 
                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}