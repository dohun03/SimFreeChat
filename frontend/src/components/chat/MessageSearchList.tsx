import { Search } from 'lucide-react';
import { useState } from 'react';
import { apiGet } from '../../services/api';
import { formatDate } from '../../utils/format';

export function MessageSearchList({ roomId }: { roomId: number }) {
  const [query, setQuery] = useState('');
  // const [results, setResults] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([
    {
      id: 101,
      user: { name: '김철수' },
      content: '형님, 오늘 저녁에 치맥 어떠십니까? 새로 생긴 통닭집이 그렇게 맛있다네요.',
      createdAt: '2026-02-22T18:30:00Z',
    },
    {
      id: 102,
      user: { name: '이영희' },
      content: '방금 공지사항 확인했는데, 내일 점심 회식 장소가 블루스퀘어 식당으로 변경되었다고 합니다. 다들 참고하세요!',
      createdAt: '2026-02-22T15:45:00Z',
    },
    {
      id: 103,
      user: { name: '박민준' },
      content: '저번에 말씀하신 프로젝트 관련 서류들 제 메일로 한 번만 더 보내주실 수 있나요? 다시 확인해보고 싶습니다.',
      createdAt: '2026-02-22T11:20:00Z',
    },
    {
      id: 104,
      user: { name: '정수진' },
      content: 'ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.',
      createdAt: '2026-02-21T22:10:00Z',
    },
    {
      id: 105,
      user: { name: '최현우' },
      content: '혹시 이 방에 계신 분들 중에 리액트 테일윈드 잘 다루시는 분 계신가요? UI 짜는 게 생각보다 손이 많이 가네요.',
      createdAt: '2026-02-21T09:05:00Z',
    },
    {
      id: 106,
      user: { name: '정수진' },
      content: 'ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.',
      createdAt: '2026-02-21T22:10:00Z',
    },
    {
      id: 107,
      user: { name: '정수진' },
      content: 'ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.ㅋㅋㅋㅋ 아 진짜 대박이네요. 그거 제가 생각했던 거랑 너무 똑같아서 소름 돋았어요.',
      createdAt: '2026-02-21T22:10:00Z',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // 실제 API 구조에 맞게 조절하세요
      const data = await apiGet(`/api/messages/${roomId}/search?q=${query}`);
      setResults(data);
    } catch (err) {
      console.error('검색 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 1. 상단 타이틀 및 블루 검색창 */}
      <div className="px-1 mb-4">
        <h3 className="text-lg font-black text-slate-800 mb-4 px-1 tracking-tight">메시지 검색</h3>
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder="대화 내용 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none text-slate-700 placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* 2. 검색 결과 목록 (아바타 제거 버전) */}
      <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((res) => (
              <div
                key={res.id}
                className="group flex flex-col gap-2 p-4 rounded-xl border border-gray-300 bg-white shadow-sm hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
                onClick={() => {/* 메시지 이동 로직 */}}
              >
                {/* 상단: 이름과 날짜 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div> {/* 포인트 점 */}
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            ) : (
              <>
                <Search size={32} className="mb-2 opacity-20" />
                <p className="text-sm italic">{query ? '검색 결과가 없습니다' : '궁금한 대화를 검색해보세요'}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}