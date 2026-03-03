import { FormEvent, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { useAuth } from '../providers/AuthProvider';

export function LoginPage() {
  const { user, reload, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!loading && user) {
      const from = location?.state?.from ?? '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  if (loading) return null;
  if (user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await apiPost('/api/auth/login', { name, password });
      await reload();
    } catch (err: any) {
      setMsg(err?.message || '로그인 실패');
    }
  }

  return (
    // h-screen과 overflow-hidden으로 전체 화면 스크롤 원천 차단
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans">
      
      {/* 좌측: 로그인 폼 영역 */}
      <div className="flex w-full flex-col justify-center overflow-y-auto px-8 sm:px-16 lg:w-[45%] xl:px-24">
        <div className="mx-auto w-full max-w-[400px] py-12">
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">SimFreeChat</h1>
            <p className="mt-3 font-bold text-slate-400 text-sm">계정에 로그인하여 대화를 이어가세요.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">사용자 아이디</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="아이디를 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">비밀번호</label>
              </div>
              <input
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full rounded-2xl bg-slate-900 py-5 text-sm font-black text-white shadow-xl shadow-slate-200 transition-all hover:bg-indigo-600 active:scale-[0.98]"
            >
              로그인
            </button>
          </form>

          {msg && (
            <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-center text-xs font-bold text-rose-500 border border-rose-100 animate-shake">
              {msg}
            </div>
          )}

          <p className="mt-12 text-center text-sm font-bold text-slate-400">
            아직 계정이 없으신가요?{' '}
            <Link className="ml-2 font-black text-indigo-600 hover:underline" to="/register">
              회원가입
            </Link>
          </p>
        </div>
      </div>

      {/* 우측: 비주얼 영역 */}
      <div className="relative hidden h-full flex-1 overflow-hidden bg-slate-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 to-slate-900/90 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop" 
          className="h-full w-full object-cover scale-105 animate-slow-zoom"
          alt="background"
        />
        <div className="absolute bottom-20 left-20 z-20 max-w-lg">
          <div className="mb-6 h-1 w-20 bg-indigo-500" />
          <h2 className="text-5xl font-black italic leading-tight text-white">Simple is best</h2>
          <p className="mt-6 text-lg font-medium text-slate-300 opacity-80 leading-relaxed">
            AI 요약 기술이 접목된 심플하고 프리한 채팅 플랫폼입니다!
          </p>
        </div>
      </div>
    </div>
  );
}