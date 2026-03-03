import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { LogOut, User as UserIcon, ShieldCheck, MessageSquareQuote, LayoutDashboard } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 활성화된 메뉴 스타일링을 위한 함수
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-700 bg-blue-600 text-white shadow-md">
      <div className="flex h-[60px] w-full items-center justify-between px-6">
        
        {/* --- 왼쪽 영역: 로고 + 관리자 전용 메뉴 --- */}
        <div className="flex items-center gap-8">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2.5 group mr-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm transition-transform group-hover:rotate-12">
              <MessageSquareQuote size={20} fill="currentColor" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase">
              SimFreeChat
            </span>
          </Link>

          {/* 관리자 전용 메뉴 (로그인 & 관리자 권한 있을 때만 노출) */}
          {user?.isAdmin && (
            <nav className="flex items-center gap-1 overflow-hidden rounded-xl bg-blue-700/50 p-1 backdrop-blur-sm">
              <Link
                to="/admin/users"
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-black transition-all ${
                  isActive('/admin/users') 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-blue-100 hover:bg-blue-500/30 hover:text-white'
                }`}
              >
                <ShieldCheck size={16} />
                <span>USERS</span>
              </Link>
              
              <Link
                to="/admin/messagelog"
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-black transition-all ${
                  isActive('/admin/messagelog') 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-blue-100 hover:bg-blue-500/30 hover:text-white'
                }`}
              >
                <LayoutDashboard size={16} />
                <span>MSG LOGS</span>
              </Link>
            </nav>
          )}
        </div>

        {/* --- 오른쪽 영역: 유저 정보 + 프로필 + 로그아웃 --- */}
        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <div className="flex items-center gap-2 border-r border-blue-500 pr-6">
                <span className="text-[14px] font-black text-white">{user.name}</span>
              </div>

              <div className="flex items-center gap-4">
                <Link to="/profile" className="text-blue-100 hover:text-white transition-colors">
                  <UserIcon size={20} />
                </Link>

                <button
                  className="flex items-center gap-2 text-[14px] font-black text-blue-100 transition-colors hover:text-rose-300"
                  onClick={async () => {
                    if (window.confirm('로그아웃 하시겠습니까?')) {
                      await logout();
                      navigate('/login');
                    }
                  }}
                >
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-[14px] font-bold text-blue-100 hover:text-white">SIGN IN</Link>
              <Link to="/register" className="rounded-lg border border-white/40 px-4 py-1.5 text-[14px] font-black text-white hover:bg-white hover:text-blue-600 transition-all">SIGN UP</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}