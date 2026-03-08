import { ChevronDown, Search, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { apiGet } from '../../services/api';
import { formatDate } from '../../utils/format';

export function MessageSearchList({ 
  roomId, 
  onMessageClick
}: { 
  roomId: number, 
  onMessageClick?: (message: any) => void 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const isValidQuery = (q: string) => {
    const trimmed = q.trim();
    return trimmed.length >= 2 && trimmed.length <= 20;
  };

  // 검색 실행 함수
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidQuery(query)) {
      alert("검색어는 2~20자 사이로 입력해주세요.");
      return;
    }
    
    setLoading(true);
    setResults([]);
    
    try {
      const data = await apiGet(`/api/messages/${roomId}/search?keyword=${encodeURIComponent(query.trim())}`);
      setResults(data);
      setHasMore(data.length === 50);
    } catch (err) {
      alert(`검색 실패: ${err}`);
      console.error('검색 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchMore = async () => {
    if (results.length === 0 || loading) return;

    const lastId = results[results.length - 1].id;
    setLoading(true);
    try {
      const moreData = await apiGet(
        `/api/messages/${roomId}/search?keyword=${query}&cursorId=${lastId}`
      );
      
      if (moreData.length > 0) {
        setResults(prev => [...prev, ...moreData]);
        setHasMore(moreData.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      alert(`추가 검색 실패: ${err}`);
      console.error('추가 검색 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  
  const handleRenderMessage = (message: any) => {
    console.log(`메시지 ID: ${message.id}`);
    
    if (onMessageClick) onMessageClick(message.id);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 상단 타이틀 및 검색창 */}
      <div className="px-1 mb-4">
        <h3 className="text-lg font-black text-slate-800 mb-4 px-1 tracking-tight">메시지 검색</h3>
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder="2글자 이상 입력해주세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none text-slate-700 placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* 검색 결과 목록 */}
      <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((res) => (
              <div
                key={res.id}
                onClick={() => handleRenderMessage(res)}
                className="group flex flex-col gap-2 p-4 rounded-xl border border-gray-300 bg-white shadow-sm hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer active:scale-[0.98]"
              >
                {/* 상단: 이름과 날짜 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-[13px] font-bold text-blue-700">
                      {res.user.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    {formatDate(res.createdAt)}
                  </span>
                </div>

                {/* 본문: 아바타가 없으므로 여백 없이 꽉 채움 */}
                <div className="mt-1">
                  <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-3 break-all">
                    {res.content}
                  </p>
                </div>
              </div>
            ))}

            {/* 더 보기 버튼 영역 */}
            {hasMore && (
              <button
                onClick={handleSearchMore}
                disabled={loading}
                className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-dashed border-slate-200 hover:border-blue-200 bg-white"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <ChevronDown size={16} className="text-slate-400" />
                    <span>검색 결과 더 보기</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            ) : (
              <>
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <MessageSquare size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium">
                  {query ? '일치하는 대화 내용이 없습니다' : '기억나지 않는 대화를 찾아보세요'}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}