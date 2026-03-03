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
  onLoadBefore, 
  onLoadRecent,
  serverLastId,
  ...props 
}: MessageListProps & { onLoadRecent?: () => void, serverLastId?: number }) {
  // useRef = DOM 저장용, div태그만 받겠다는 뜻, .current 속성에 항상 들어있음
  // 또는 변수 저장용, 일반 선언과 다르게 재 렌더링 시 초기화 안됨.
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | string | null>(null);
  const [topLock, setTopLock] = useState(false);
  const [bottomLock, setBottomLock] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const scrollSnapshot = useRef<{ height: number; top: number } | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    // const container = containerRef.current;
    // if (!container) return;
    
    // // 1차 즉시 이동
    // container.scrollTop = container.scrollHeight;

    // // 2차 레이아웃 보정 (렌더링 지연 대응)
    // requestAnimationFrame(() => {
    //   container.scrollTop = container.scrollHeight;
    // });

    // // 3차 최종 보정 (이미지나 긴 텍스트 렌더링 시간 벌기)
    // setTimeout(() => {
    //   if (container) container.scrollTop = container.scrollHeight;
    // }, 100);
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
    const container = containerRef.current;
    if (!container || isInitialLoading) return;

    const currentLastMessage = messages[messages.length - 1];
    const currentLastId = currentLastMessage?.id || null;

    // 과거 데이터 로드 스냅샷 (이건 기존 유지)
    if (scrollSnapshot.current) {
      const { height, top } = scrollSnapshot.current;
      const addedHeight = container.scrollHeight - height;
      if (addedHeight > 0) container.scrollTop = top + addedHeight;
      scrollSnapshot.current = null;
      lastMessageIdRef.current = currentLastId;
      return;
    }

    const isNewMessage = currentLastId !== lastMessageIdRef.current;
    lastMessageIdRef.current = currentLastId;

    if (!isNewMessage) return;

    const isMyMessage = currentLastMessage?.user?.id === currentUserId;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 250;

    if (isAtBottom || isMyMessage) {
      scrollToBottom('auto');
    }
  }, [messages, currentUserId, isInitialLoading]);

  // useEffect(() => {
  //   if (messages.length > 0 && isInitialLoading) {
  //     // 컴포넌트 마운트 후 렌더링 시간을 충분히 주기 위해 지연 실행
  //     const timer = setTimeout(() => {
  //       scrollToBottom('smooth');
  //       setIsInitialLoading(false);
  //     }, 200); 
  //     return () => clearTimeout(timer);
  //   }
  // }, [messages.length, isInitialLoading]);
  useEffect(() => {
    if (messages.length > 0 && isInitialLoading) {
      // 0ms로 즉시 실행
      const timer = setTimeout(() => {
        scrollToBottom(); // behavior 인자 없이 실행 (기본 auto)
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
    const myLastId = Number(messages[messages.length - 1]?.id || 0);

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