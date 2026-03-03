import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../../services/api';
import { formatDate } from '../../utils/format';
import { 
  Search, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter,
  Layers
} from 'lucide-react';

export function AdminMessageLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any>({ roomIds: [], roomOwnerIds: [], userIds: [] });
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null);

  // 1. URL 파라미터 추출 (바닐라 JS 필터 완벽 대응)
  const q = {
    search: searchParams.get('search') || '',
    searchType: searchParams.get('searchType') || '',
    year: searchParams.get('year') || '2026',
    month: searchParams.get('month') || '',
    messageType: searchParams.get('messageType') || '',
    actionType: searchParams.get('actionType') || '',
    roomIdType: searchParams.get('roomIdType') || '',
    roomOwnerIdType: searchParams.get('roomOwnerIdType') || '',
    userIdType: searchParams.get('userIdType') || '',
    line: searchParams.get('line') || '50',
    cursor: searchParams.get('cursor') || '',
    direction: searchParams.get('direction') || '',
    page: Number(searchParams.get('page')) || 1
  };

  // 2. 메타데이터 초기 로드 (방 ID, 유저 ID 등)
  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiGet('/api/messages/log/metadata');
        setMeta(res);
      } catch (err) { console.error(err); }
    })();
  }, []);

  // 3. 로그 데이터 로치 (날짜 범위 계산 로직 포함)
  const fetchLogs = async () => {
    setLoading(true);
    const { year, month, ...rest } = q;
    
    // 바닐라 JS의 getDateRange 로직 이식
    let startDate = '';
    let endDate = '';
    if (year) {
      if (!month) {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      } else {
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        startDate = `${year}-${month.padStart(2, '0')}-01`;
        endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
      }
    }

    const queryObj: any = { ...rest, startDate, endDate };
    const query = new URLSearchParams();
    Object.entries(queryObj).forEach(([k, v]) => { if (v) query.append(k, String(v)); });

    try {
      const res: any = await apiGet(`/api/messages/logs?${query.toString()}`);
      let data = res.messageLogs;
      if (q.direction === 'prev') data = [...data].reverse();
      setLogs(data);
      setTotal(res.totalCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [searchParams]);

  // 4. 필터 업데이트 (필터 변경 시 페이징 리셋)
  const updateParams = (newParams: Record<string, string | number>) => {
    const next = new URLSearchParams(searchParams);
    next.delete('cursor');
    next.delete('direction');
    next.set('page', '1');
    Object.entries(newParams).forEach(([k, v]) => v === '' ? next.delete(k) : next.set(k, String(v)));
    setSearchParams(next);
  };

  // 5. 커서 기반 페이징 이동
  const movePage = (dir: 'prev' | 'next') => {
    if (logs.length === 0) return;
    const next = new URLSearchParams(searchParams);
    if (dir === 'prev') {
      next.set('cursor', String(logs[0].id));
      next.set('direction', 'prev');
      next.set('page', String(q.page - 1));
    } else {
      next.set('cursor', String(logs[logs.length - 1].id));
      next.set('direction', 'next');
      next.set('page', String(q.page + 1));
    }
    setSearchParams(next);
  };

  const totalPages = Math.ceil(total / Number(q.line)) || 1;

  return (
    <div className="mx-auto mt-12 mb-10 max-w-7xl px-4 animate-in fade-in duration-500 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">메시지 로그 관리</h2>
          <p className="text-sm font-medium text-slate-500">서비스 내의 모든 대화 로그를 모니터링합니다.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-blue-700">
          <MessageSquare size={18} className="font-bold" />
          <span className="text-sm font-black">총 {total.toLocaleString()}건</span>
        </div>
      </div>

      {/* 필터 섹션: 바닐라 JS 기능 모두 유지 */}
      <div className="mb-4 space-y-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        {/* 검색바 라인 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={18} className="text-slate-400" />
            <input 
              className="flex-grow bg-transparent text-sm font-bold outline-none"
              placeholder="검색 (유저명, 방 이름, 메시지 내용)"
              defaultValue={q.search}
              onKeyDown={(e: any) => e.key === 'Enter' && updateParams({ search: e.target.value })}
            />
            <select 
              value={q.searchType} 
              onChange={(e) => updateParams({ searchType: e.target.value })}
              className="border-l border-slate-200 bg-transparent pl-2 text-xs font-black text-slate-600 outline-none"
            >
              <option value="">전체 검색</option>
              <option value="message">메시지 내용</option>
              <option value="user">유저명</option>
              <option value="room">방 이름</option>
            </select>
          </div>
          <button 
            onClick={() => {
              const input = document.querySelector('input') as HTMLInputElement;
              updateParams({ search: input.value });
            }}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 transition-all"
          >
            검색하기
          </button>
        </div>

        {/* 상세 필터 라인 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <select value={q.year} onChange={(e) => updateParams({ year: e.target.value })} className="rounded-md border-none bg-white px-2 py-1 text-xs font-bold shadow-sm outline-none">
              {['2026', '2025', '2024', '2023', '2022'].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={q.month} onChange={(e) => updateParams({ month: e.target.value })} className="rounded-md border-none bg-white px-2 py-1 text-xs font-bold shadow-sm outline-none">
              <option value="">전체 월</option>
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                return <option key={m} value={m}>{i + 1}월</option>;
              })}
            </select>
          </div>

          <select value={q.messageType} onChange={(e) => updateParams({ messageType: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none hover:border-blue-500 transition-all">
            <option value="">[메시지 타입]</option>
            <option value="TEXT">TEXT</option>
            <option value="IMAGE">IMAGE</option>
          </select>

          <select value={q.actionType} onChange={(e) => updateParams({ actionType: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none hover:border-blue-500 transition-all">
            <option value="">[액션 타입]</option>
            <option value="SEND">SEND</option>
            <option value="EDIT">EDIT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select value={q.roomIdType} onChange={(e) => updateParams({ roomIdType: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none hover:border-blue-500 transition-all max-w-[120px]">
            <option value="">[방 ID]</option>
            {meta.roomIds.map((id: any) => <option key={id} value={id}>{id}</option>)}
          </select>

          <select value={q.roomOwnerIdType} onChange={(e) => updateParams({ roomOwnerIdType: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none hover:border-blue-500 transition-all max-w-[120px]">
            <option value="">[방장 ID]</option>
            {meta.roomOwnerIds.map((id: any) => <option key={id} value={id}>{id}</option>)}
          </select>

          <select value={q.userIdType} onChange={(e) => updateParams({ userIdType: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none hover:border-blue-500 transition-all max-w-[120px]">
            <option value="">[유저 ID]</option>
            {meta.userIds.map((id: any) => <option key={id} value={id}>{id}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-3">
            <select value={q.line} onChange={(e) => updateParams({ line: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none">
              <option value="50">50줄</option>
              <option value="100">100줄</option>
              <option value="300">300줄</option>
            </select>
            
            <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
              <button disabled={q.page <= 1} onClick={() => movePage('prev')} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs font-black text-slate-700">{q.page} / {totalPages}</span>
              <button disabled={q.page >= totalPages} onClick={() => movePage('next')} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 섹션: 끈적한 헤더와 클릭 기능 유지 */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="max-h-[600px] overflow-auto text-[13px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-tighter text-[11px]">No.</th>
                <th className="px-4 py-3 font-black text-slate-900">방 정보</th>
                <th className="px-4 py-3 font-black text-slate-900">유저 정보</th>
                <th className="px-4 py-3 font-black text-slate-900">메시지 내용 (클릭)</th>
                <th className="px-4 py-3 font-black text-slate-900 text-center">타입/액션</th>
                <th className="px-4 py-3 font-black text-slate-900 text-right">시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">로그 데이터를 불러오는 중...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">해당 조건의 로그가 없습니다.</td></tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300 text-xs">{(q.page - 1) * Number(q.line) + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.roomName}</div>
                      <div className="text-[10px] text-slate-400">ID: {log.roomId} / Owner: {log.roomOwnerId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-400">User ID: {log.userId}</div>
                    </td>
                    <td 
                      className="px-4 py-3 max-w-xs truncate text-blue-600 font-bold cursor-pointer hover:underline"
                      onClick={() => setSelectedMsg(log.messageContent)}
                    >
                      {log.messageContent}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black mr-1 ${log.type === 'IMAGE' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {log.type}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${log.action === 'DELETE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 메시지 상세보기 모달 */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedMsg(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl scale-in-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-black flex items-center gap-2">
                <Layers className="text-blue-500" size={20} /> 메시지 원본 내용
              </h4>
              <button onClick={() => setSelectedMsg(null)} className="text-slate-400 hover:text-slate-600">
                <ChevronLeft size={24} />
              </button>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-auto border border-slate-100 font-medium text-slate-700">
              {selectedMsg}
            </div>
            <button 
              onClick={() => setSelectedMsg(null)}
              className="mt-5 w-full py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-black transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}