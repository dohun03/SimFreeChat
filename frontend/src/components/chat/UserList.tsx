import { Search } from 'lucide-react';
import { useState } from 'react';

type User = { id: number; name: string };

type UserListProps = {
  users: User[];
  ownerId: number;
  currentUserId: number;
  isOwner: boolean;
  onUserClick: (userId: number) => void;
  onKick: (userId: number) => void;
  onBan: (userId: number) => void;
};

export function UserList({ users, ownerId, currentUserId, onUserClick }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 1. 상단 타이틀 및 블루 테마 검색창 */}
      <div className="px-1 mb-4">
        <h3 className="text-lg font-black text-slate-800 mb-4 px-1 tracking-tight">참여자 목록</h3>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder="사용자 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 2. 유저 목록 리스트 (구분선 추가) */}
      <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => onUserClick(user.id)}
              className={`
                group mb-2 flex cursor-pointer items-center gap-3 p-3 transition-all
                rounded-xl border border-gray-300 shadow-sm
                hover:border-blue-400 hover:bg-blue-50/30 active:scale-[0.98]
                ${user.id === currentUserId ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-100' : 'bg-white'}
              `}
            >
              {/* 아바타 영역 */}
              <div className="relative shrink-0">
                <div className={`
                  h-10 w-10 rounded-full flex items-center justify-center font-bold text-[14px]
                  ${user.id === currentUserId 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:border-blue-200 border border-transparent'}
                  transition-all duration-300
                `}>
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></div>
              </div>

              {/* 유저 정보 */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span className={`truncate text-[14px] font-bold ${user.id === currentUserId ? 'text-blue-700' : 'text-slate-700'}`}>
                    {user.name}
                  </span>
                  {user.id === ownerId && (
                    <span className="shrink-0 text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider border border-blue-200">
                      방장
                    </span>
                  )}
                </div>
                <span className="truncate text-[11px] text-slate-400 font-medium mt-0.5">
                   {user.id === currentUserId ? '나' : '참여자'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-slate-400 text-sm italic">
            No results for "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}