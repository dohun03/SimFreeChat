import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Users, 
  Lock, 
  Unlock, 
  Calendar, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { apiGet } from '../services/api';
import { useAuth } from '../providers/AuthProvider';
import { RoomCreateModal } from '../modals/RoomCreateModal';

// --- Types ---
type Room = {
  id: number;
  name: string;
  owner: { id: number; name: string };
  currentMembers: number;
  maxMembers: number;
  createdAt: string;
  password?: string | null;
};

// --- Utils ---
function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function RoomsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [sort, setSort] = useState<'popular_desc' | 'popular_asc' | 'createdAt_desc' | 'createdAt_asc'>('popular_desc');

  // 정렬 레이블 계산
  const sortLabel = useMemo(() => {
    const direction = sort.endsWith('desc') ? '내림차순' : '오름차순';
    if (sort.startsWith('popular')) return `인기순 ${direction}`;
    return `생성일 ${direction}`;
  }, [sort]);

  // 데이터 로드 함수
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, totalRes] = await Promise.all([
        apiGet<Room[]>(`/api/rooms?search=${encodeURIComponent(search)}&sort=${sort}`),
        apiGet<number>('/api/rooms/total-users'),
      ]);
      
      setRooms(roomsRes ?? []);
      setTotalUsers(totalRes ?? 0);
    } catch (e) {
      console.error("방 목록 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  // 초기 로드 및 조건 변경 시 실행
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* 1. 상단 배너 섹션 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-blue-200">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Community
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              실시간 대화방에<br />참여해보세요
            </h1>
            <p className="text-blue-100 text-lg font-medium">
              현재 <span className="text-white font-black text-2xl">{totalUsers}</span>명의 사용자가 접속 중입니다.
            </p>
          </div>
          
          <button
            onClick={() => {
              if (!user) {
                alert('로그인이 필요한 서비스입니다.');
                navigate('/login');
                return;
              }
              setIsCreateModalOpen(true)
            }}
            className="group flex items-center gap-3 bg-white text-blue-700 px-8 py-5 rounded-2xl text-xl font-black shadow-xl hover:bg-blue-50 transition-all hover:-translate-y-1 active:scale-95 shrink-0"
          >
            <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
            새 대화방 만들기
          </button>
        </div>
        
        {/* 배경 장식용 원형 */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* 2. 필터 및 컨트롤 바 */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between sticky top-4 z-20 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex flex-1 gap-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            className="w-full bg-slate-100 border-none rounded-xl py-3.5 pl-12 pr-4 text-base font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20 focus:bg-white transition-all"
            placeholder="검색어로 방 찾기 (Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 hover:border-blue-400 transition-all shadow-sm"
            onClick={() => {
              if (sort.startsWith('popular')) setSort(sort.endsWith('desc') ? 'popular_asc' : 'popular_desc');
              else setSort(sort.endsWith('desc') ? 'createdAt_asc' : 'createdAt_desc');
            }}
          >
            {sort.startsWith('popular') ? <TrendingUp size={18}/> : <Clock size={18}/>}
            {sortLabel}
          </button>
          
          <button
            className="px-4 py-3.5 rounded-xl bg-slate-800 text-white text-sm font-black hover:bg-slate-700 transition-colors shadow-lg"
            onClick={() => setSort(sort.startsWith('popular') ? 'createdAt_desc' : 'popular_desc')}
          >
            전환
          </button>
        </div>
      </div>

      {/* 3. 방 목록 리스트 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black text-xl animate-pulse">데이터를 불러오는 중...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 text-slate-400">
          <MessageCircle size={64} strokeWidth={1} className="mb-4 opacity-20" />
          <h2 className="text-2xl font-black">검색된 방이 없어요</h2>
          <p className="font-bold mt-2">다른 검색어를 입력하거나 새로운 방을 만들어보세요!</p>
          <button 
            className="mt-6 text-blue-600 font-black hover:underline" 
            onClick={() => {setSearch(''); load();}}
          >
            모든 방 보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((r) => (
            <div
              key={r.id}
              className="group flex flex-col justify-between bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-200/50 hover:-translate-y-2 cursor-pointer relative overflow-hidden"
              onClick={() => navigate(`/room/${r.id}`)}
            >
              {/* 상단 장식 바 (비공개방은 다른 색상) */}
              <div className={`absolute top-0 left-0 w-full h-2 ${r.password ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black ${r.password ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {r.password ? <Lock size={14} strokeWidth={3} /> : <Unlock size={14} strokeWidth={3} />}
                    {r.password ? 'Private' : 'Public'}
                  </div>
                  <span className="text-[11px] font-black text-slate-300 tracking-widest uppercase">Room ID: {r.id}</span>
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors mb-2">
                  {r.name}
                </h3>
              </div>

              <div className="space-y-6">
                {/* 인원 상태 섹션 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                      <Users size={16} />
                      <span className="text-xs uppercase tracking-tight">Members</span>
                    </div>
                    <div className="text-lg font-black text-blue-600">
                      {r.currentMembers} <span className="text-slate-300 text-sm font-bold">/ {r.maxMembers}</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ease-out rounded-full ${
                        r.currentMembers >= r.maxMembers ? 'bg-rose-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${(r.currentMembers / r.maxMembers) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* 하단 유저 정보 */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-blue-600 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {r.owner?.name?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Owner</p>
                      <p className="text-sm font-black text-slate-700">{r.owner?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-1">
                      <Calendar size={12} />
                      {formatDate(r.createdAt)}
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isCreateModalOpen && (
        <RoomCreateModal onClose={() => {setIsCreateModalOpen(false);}}/>
      )}
    </div>
  );
}