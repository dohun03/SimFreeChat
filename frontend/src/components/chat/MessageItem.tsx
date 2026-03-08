import { formatDate, escapeHtml } from '../../utils/format';
import { Trash2 } from 'lucide-react';

export type Message = {
  id: number;
  user: { id: number; name: string };
  content: string;
  createdAt: string;
  type: 'text' | 'image';
  isDeleted: boolean;
};

type MessageItemProps = {
  message: Message;
  currentUserId: number;
  roomId: number;
  onDelete?: (id: number) => void;
  onUserClick?: (userId: number) => void;
  onImageClick?: (imageUrl: string) => void;
};

export function MessageItem({ 
  message, 
  currentUserId, 
  roomId, 
  onDelete, 
  onImageClick,
  onUserClick
}: MessageItemProps) {
  const isMine = message.user.id === currentUserId;
  const date = formatDate(message.createdAt);

  const getThumbnailUrl = (filename: string) => {
    const nameOnly = filename.substring(0, filename.lastIndexOf('.'));
    return `/uploads/rooms/${roomId}/thumb-${nameOnly}.webp`;
  };
  const getOriginalUrl = (filename: string) => `/uploads/rooms/${roomId}/${filename}`;

  return (
    <li
      id={`msg-${message.id}`}
      className={`group mb-4 flex w-full ${isMine ? 'justify-end' : 'justify-start'} px-6 transition-colors duration-500 ease-in-out`}
    >
      <div className={`flex max-w-[85%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        
        {/* 이름 & 시간 영역 */}
        <div className={`mb-1 flex items-center gap-2 px-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMine && (
            <span 
              className="text-[13px] font-black text-slate-700 tracking-tight cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onUserClick?.(message.user.id)}
            >
              {message.user.name}
            </span>
          )}
          <span className="text-[11px] font-medium text-slate-400">{date}</span>
        </div>

        {/* 메시지 본문 영역 */}
        <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`relative w-fit px-4 py-2.5 text-[15px] font-medium leading-relaxed shadow-sm transition-colors ${
            isMine 
              ? 'bg-blue-600 text-white rounded-xl rounded-tr-none' // 내 메시지: 블루 + 오른쪽 위 뾰족하게
              : 'bg-slate-200 text-slate-800 rounded-xl rounded-tl-none' // 상대 메시지: 회색 + 왼쪽 위 뾰족하게
          }`}>
            {message.isDeleted ? (
              <span className="text-xs italic opacity-50">삭제된 메시지입니다.</span>
            ) : message.type === 'image' ? (
              <img 
                src={getThumbnailUrl(message.content)} 
                // aspect-ratio와 contain-intrinsic-size를 조합해 로딩 전 높이 확보
                className="max-h-[300px] w-auto min-h-[150px] rounded-xl border border-black/5 cursor-pointer"
                style={{ 
                  aspectRatio: 'attr(width) / attr(height)', // 브라우저가 비율을 미리 알 수 있게 함
                  contentVisibility: 'auto' 
                }}
                alt="채팅 이미지" 
                onClick={() => onImageClick?.(getOriginalUrl(message.content))}
              />
            ) : (
              <span className="whitespace-pre-wrap break-all">{(message.content)}</span>
            )}
          </div>

          {/* 삭제 버튼 (Trash2) */}
          {isMine && !message.isDeleted && (
            <button
              className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
              onClick={() => confirm('삭제하시겠습니까?') && onDelete?.(message.id)}
              title="메시지 삭제"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          )}
        </div>

      </div>
    </li>
  );
}