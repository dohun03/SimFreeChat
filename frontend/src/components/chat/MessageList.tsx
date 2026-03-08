import { useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react';
import { MessageItem, Message } from './MessageItem';

export type { Message };

interface DateItem {
  type: 'date';
  date: string;
  id: string;
}

type MessageListProps = {
  messages: Message[];
  currentUserId: number;
  roomId: number;
  jumpTargetId?: number | null;
  onJumpComplete?: () => void;
  onLoadBefore?: () => void;
  onDelete?: (id: number) => void;
  onUserClick?: (userId: number) => void;
  onImageClick?: (imageUrl: string) => void;
};

function isDateItem(item: Message | DateItem): item is DateItem {
  return (item as DateItem).type === 'date';
}

export function MessageList({ 
  messages,
  currentUserId,
  roomId,
  jumpTargetId,
  onJumpComplete,
  onLoadBefore,
  onLoadRecent,
  serverLastId,
  ...props
}: MessageListProps & { onLoadRecent?: () => void, serverLastId?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [topLock, setTopLock] = useState(false);
  const [bottomLock, setBottomLock] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const scrollSnapshot = useRef<{ height: number; top: number } | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!container) return;
    
    // 즉시 이동
    container.scrollTop = container.scrollHeight;

    // 브라우저 렌더링 타이밍 때문에 씹힐 수 있으니 한 번만 더 즉시 실행
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight;
    });
  };

  // useMemo = messages 변수(배열) 값이 바뀔때만 해당 함수 실행
  // 날짜선 생성 함수
  const renderedItems = useMemo(() => {
    const items: (Message | DateItem)[] = [];
    let lastDate = '';

    messages.forEach((msg) => {
      const currentDate = new Date(msg.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
      });

      if (currentDate !== lastDate) {
        items.push({ type: 'date', date: currentDate, id: `date-${msg.id}` });
        lastDate = currentDate;
      }
      items.push(msg);
    });
    return items;
  }, [messages]);

  useLayoutEffect(() => {
    if (!jumpTargetId || messages.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // 브라우저 렌더링이 완료된 후 실행되도록 큐에 넣음
    requestAnimationFrame(() => {
      const targetElement = document.getElementById(`msg-${jumpTargetId}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
        
        targetElement.classList.add('animate-highlight');
        setTimeout(() => targetElement.classList.remove('animate-highlight'), 2000);

        // 점프가 완료되었음을 확실히 한 뒤에 상태 해제
        setIsInitialLoading(false);
        onJumpComplete?.();
      }
    });
  }, [jumpTargetId, messages.length]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || isInitialLoading || jumpTargetId) return;

    const currentLastMessage = messages[messages.length - 1];
    const currentLastId = currentLastMessage?.id || null;

    // 과거 데이터 로드 스냅샷
    if (scrollSnapshot.current) {
      const { height, top } = scrollSnapshot.current;
      const addedHeight = container.scrollHeight - height;
      if (addedHeight > 0) container.scrollTop = top + addedHeight;
      scrollSnapshot.current = null;
      lastMessageIdRef.current = currentLastId;
      return;
    }

    const isNewMessage = currentLastId !== lastMessageIdRef.current;
    if (!isNewMessage) return;

    const isRealEnd = Number(currentLastId) >= (serverLastId || 0);
    const isMyMessage = currentLastMessage?.user?.id === currentUserId;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

    // 내 메시지이거나 이미 바닥을 보고 있을 때만 스크롤 이동
    if (isRealEnd && (isAtBottom || isMyMessage)) {
      scrollToBottom('auto');
    }
    
    lastMessageIdRef.current = currentLastId;
  }, [messages, currentUserId, isInitialLoading, jumpTargetId, serverLastId]);

  useEffect(() => {
    if (messages.length > 0 && isInitialLoading) {
      const timer = setTimeout(() => {
        scrollToBottom();
        setIsInitialLoading(false);
      }, 0); 
      return () => clearTimeout(timer);
    }
  }, [messages.length, isInitialLoading]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    // 1. TOP 스크롤 (과거 로드)
    if (!topLock && container.scrollTop <= 5 && onLoadBefore) {
      scrollSnapshot.current = { height: container.scrollHeight, top: container.scrollTop };
      setTopLock(true);
      onLoadBefore();
      setTimeout(() => setTopLock(false), 500);
    }

    // 2. BOTTOM 스크롤 (최신 로드)
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
    const currentList = messagesRef.current; 
    const myLastId = Number(currentList[currentList.length - 1]?.id || 0);
    // 바닥에 도달했고, 현재 내 마지막 ID < 서버의 마지막 ID
    if (!bottomLock && isAtBottom && onLoadRecent && myLastId < (serverLastId || 0)) {
      setBottomLock(true);
      onLoadRecent();
      setTimeout(() => setBottomLock(false), 500);
    }
  };

  return (
    <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-6 py-8">
      <ul className="m-0 list-none flex flex-col gap-1">
        {topLock && <div className="text-center py-2 text-xs text-slate-400">과거 내역 로딩 중...</div>}
        
        {renderedItems.map((item) => {
          if (isDateItem(item)) {
            return (
              <li key={item.id} className="my-6 flex items-center justify-center">
                <div className="h-[1px] flex-1 bg-slate-200"></div>
                <span className="mx-4 text-[11px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm whitespace-nowrap">
                  {item.date}
                </span>
                <div className="h-[1px] flex-1 bg-slate-200"></div>
              </li>
            );
          }
          return (
            <MessageItem
              key={item.id}
              message={item}
              currentUserId={currentUserId}
              roomId={roomId}
              onDelete={props.onDelete}
              onUserClick={props.onUserClick}
              onImageClick={props.onImageClick}
            />
          );
        })}
      </ul>
    </div>
  );
}