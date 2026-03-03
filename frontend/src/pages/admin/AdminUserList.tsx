import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../../services/api';
import { formatDate } from '../../utils/format';
import { 
  Search, 
  UserCheck, 
  UserMinus, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Users
} from 'lucide-react';

export function AdminUserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ users: [], totalCount: 0 });
  const [loading, setLoading] = useState(false);

  const search = searchParams.get('search') || '';
  const isAdmin = searchParams.get('isAdmin') || '';
  const isBanned = searchParams.get('isBanned') || '';
  const limit = Number(searchParams.get('limit')) || 50;
  const page = Number(searchParams.get('page')) || 1;

  const loadUsers = async () => {
    setLoading(true);
    const offset = (page - 1) * limit;
    const queryObj: any = { search, isAdmin, isBanned, limit: String(limit), offset: String(offset) };
    
    const query = new URLSearchParams();
    Object.entries(queryObj).forEach(([k, v]) => {
      if (v) query.append(k, v as string);
    });

    try {
      const res: any = await apiGet(`/api/users?${query.toString()}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [searchParams]);

  const updateParams = (newParams: Record<string, string | number>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === '') nextParams.delete(key);
      else nextParams.set(key, String(val));
    });
    if (!newParams.page) nextParams.set('page', '1'); 
    setSearchParams(nextParams);
  };

  const totalPages = Math.ceil(data.totalCount / limit) || 1;

  return (
    // mt-12로 상단 간격 확보, max-w-[1000px]로 가로폭 축소
    <div className="mx-auto mt-12 mb-10 max-w-[1000px] px-4 animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">유저 관리</h2>
          <p className="text-sm font-medium text-slate-500">서비스의 모든 사용자 권한 및 상태를 제어합니다.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-indigo-700">
          <Users size={18} className="font-bold" />
          <span className="text-sm font-black">총 {data.totalCount.toLocaleString()}명</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
            <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500" />
            <input 
              className="bg-transparent text-sm font-bold outline-none"
              placeholder="이름 또는 이메일 검색"
              defaultValue={search}
              onKeyDown={(e: any) => e.key === 'Enter' && updateParams({ search: e.target.value })}
            />
          </div>

          {/* 둥근 형태의 부트스트랩 스타일 셀렉트 박스 */}
          <select 
            value={isAdmin} 
            onChange={(e) => updateParams({ isAdmin: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="">[권한 필터]</option>
            <option value="true">관리자</option>
            <option value="false">일반 사용자</option>
          </select>

          <select 
            value={isBanned} 
            onChange={(e) => updateParams({ isBanned: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="">[밴 여부]</option>
            <option value="true">밴 처리됨</option>
            <option value="false">정상 유저</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* 줄 수 표시 개선: "줄" 단위로만 표기 */}
          <select 
            value={limit} 
            onChange={(e) => updateParams({ limit: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="50">50줄</option>
            <option value="100">100줄</option>
            <option value="300">300줄</option>
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
            <button 
              disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 })}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-xs font-black text-slate-700">{page} / {totalPages}</span>
            <button 
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: page + 1 })}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="max-h-[650px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[11px]">ID</th>
                <th className="px-6 py-4 font-black text-slate-900">사용자 정보</th>
                <th className="px-6 py-4 font-black text-slate-900">이메일</th>
                <th className="px-6 py-4 font-black text-slate-900 text-center">권한</th>
                <th className="px-6 py-4 font-black text-slate-900 text-center">상태</th>
                <th className="px-6 py-4 font-black text-slate-900 text-right">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400">데이터를 가져오는 중...</td></tr>
              ) : data.users.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400">해당 조건의 유저가 없습니다.</td></tr>
              ) : (
                data.users.map((u: any) => {
                  const isCurrentlyBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-indigo-50/30"
                    >
                      <td className="px-6 py-4 text-slate-300 font-medium">{u.id}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{u.name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{u.email}</td>
                      <td className="px-6 py-4 text-center">
                        {u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-2.5 py-1 text-[11px] font-black text-indigo-600">
                            <Shield size={12} /> ADMIN
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">USER</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isCurrentlyBanned ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-600">
                            <UserMinus size={12} /> BANNED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-600">
                            <UserCheck size={12} /> ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}