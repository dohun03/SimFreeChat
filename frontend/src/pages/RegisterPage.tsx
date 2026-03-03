import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { useAuth } from '../providers/AuthProvider';

export function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');

  if (user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (password !== confirmPassword) {
      setMsg('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      await apiPost('/api/users/register', { name, email, password });
      navigate('/login');
    } catch (err: any) {
      setMsg(err?.message || '회원가입 실패');
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans">
      
      <div className="flex w-full flex-col justify-center overflow-y-auto px-8 sm:px-16 lg:w-[45%] xl:px-24">
        <div className="mx-auto w-full max-w-[400px] py-12">
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">SimFreeChat</h1>
            <p className="mt-3 font-bold text-slate-400 text-sm">간단한 정보 입력으로 서비스를 시작하세요.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">아이디</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-emerald-500 focus:bg-white"
                placeholder="사용할 아이디"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">이메일 주소</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-emerald-500 focus:bg-white"
                placeholder="example@mail.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">비밀번호</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-emerald-500 focus:bg-white"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">비밀번호 확인</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none transition-all focus:border-emerald-500 focus:bg-white"
                placeholder="••••••••"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button className="mt-6 w-full rounded-2xl bg-emerald-600 py-5 text-sm font-black text-white shadow-xl shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-[0.98]">
              회원가입
            </button>
          </form>

          {msg && (
            <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-center text-xs font-bold text-rose-500 border border-rose-100">
              {msg}
            </div>
          )}

          <p className="mt-8 text-center text-sm font-bold text-slate-400">
            계정이 이미 있으신가요?{' '}
            <Link className="ml-2 font-black text-emerald-600 hover:underline" to="/login">
              로그인하기
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden h-full flex-1 overflow-hidden bg-emerald-600 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/50 to-emerald-900/90 z-10" />
        <div className="absolute top-20 right-20 z-20 text-right">
          <h2 className="text-5xl font-black leading-tight text-white italic tracking-tighter">Simple is best</h2>
          <p className="mt-4 text-lg font-bold text-emerald-100 opacity-90">빠르고 간편한 가입으로 서비스를 즐기세요!</p>
        </div>
      </div>
    </div>
  );
}