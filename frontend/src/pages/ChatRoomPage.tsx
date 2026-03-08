import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../hooks/useSocket';
import { MessageList } from '../components/chat/MessageList';
import { UserList } from '../components/chat/UserList';
import { MessageInput } from '../components/chat/MessageInput';
import { MessageSearchList } from '../components/chat/MessageSearchList';
import { UserInfoModal } from '../modals/UserInfoModal';
import { ImageModal } from '../modals/ImageModal';
import { ShieldAlert, Sparkles, LogOut, ChevronDown, Users, Ban, Circle, Settings  } from 'lucide-react';
import { RoomBanManagerModal } from '../modals/RoomBanManagerModal';
import { RoomEditModal } from '../modals/RoomEditModal';
import { SummaryModal } from '../modals/SummaryModal';

export function ChatRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [serverLastId, setServerLastId] = useState(0);
  const [jumpTargetId, setJumpTargetId] = useState<number | null>(null);
  const [errorReason, setErrorReason] = useState<{ title: string; desc: string } | null>(null);
  const { messages, setMessages, roomUsers, typingUsers, actions } = useSocket(
    roomId, 
    room,
    user?.id
  );

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // 계정 밴 여부 체크
    if (user.bannedUntil) {
      const bannedUntil = new Date(user.bannedUntil);
      const now = new Date();
      if (bannedUntil > now) {
        setErrorReason({
          title: "계정 이용 정지",
          desc: `관리자에 의해 이용이 정지되었습니다. 사유: ${user.banReason}`
        });
        return;
      }
    }

    const fetchRoomData = async () => {
      try {
        const data = await apiGet(`/api/rooms/${roomId}`);
        
        // 방별 밴 여부 체크
        const bannedList = await apiGet(`/api/room-users/${roomId}`);
        const myBanInfo = bannedList.find((b: any) => b.user.id === user.id);
        if (myBanInfo) {
          setErrorReason({
            title: "입장 제한",
            desc: `이 대화방에서 차단(Ban)되어 입장하실 수 없습니다.  사유: ${myBanInfo.banReason}`
          });
          return;
        }

        // 인원 초과 체크
        if (data.currentMembers >= data.maxMembers && data.owner.id !== user.id) {
          setErrorReason({
            title: "정원 초과",
            desc: "방 인원이 가득 차서 더 이상 입장할 수 없습니다."
          });
          return;
        }

        setRoom(data);
      } catch (err) {
        setErrorReason({
          title: "에러 발생",
          desc: `사유: ${err}`
        });
        return;
      }
    };

    fetchRoomData();
  }, [roomId, user, navigate]);

  const loadingRef = useRef(false);

  // 메시지 DOM 참조용
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // 서버 메시지 마지막 ID 동기화
  useEffect(() => {
    if (messages.length > 0) {
      const lastId = Number(messages[messages.length - 1].id);
      setServerLastId(prev => Math.max(prev, lastId));
    }
  }, [messages]);

  const loadMessages = useCallback(async (direction: 'init' | 'before' | 'recent' = 'init') => {
    if (loadingRef.current || !roomId) return;

    const currentMsgs = messagesRef.current;
    const firstId = messagesRef.current[0]?.id;
    const lastId = currentMsgs[currentMsgs.length - 1]?.id;

    let url = `/api/messages/${roomId}`;
    if (direction === 'before' && firstId) url += `?direction=before&cursor=${firstId}`;
    else if (direction === 'recent' && lastId) url += `?direction=recent&cursor=${lastId}`;

    try {
      loadingRef.current = true; // 플래그 먼저 세우기
      setLoading(true);

      const msgs = await apiGet<any[]>(url);
      
      if (msgs && msgs.length > 0) {
        if (direction === 'init' || direction === 'recent') {
          setServerLastId(Number(msgs[msgs.length - 1].id));
        }

        setMessages(prev => {
          if (direction === 'before') return [...msgs, ...prev];
          if (direction === 'recent') return [...prev, ...msgs].slice(-200);
          return msgs; // init
        });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [roomId, serverLastId]);

  useEffect(() => {
    if (user && roomId && room) {
      loadMessages('init');
    }
  }, [roomId, !!user, !!room]);

  const loadSearchedMessageAround = useCallback(async (targetId: number) => {
    if (loadingRef.current || !roomId) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      
      setMessages([]); 

      const msgs = await apiGet<any[]>(`/api/messages/${roomId}/context?targetId=${targetId}`);
      
      if (msgs && msgs.length > 0) {
        const uniqueMap = new Map();
        msgs.forEach(m => uniqueMap.set(m.id, m));
        const cleanMsgs = Array.from(uniqueMap.values()).sort((a, b) => a.id - b.id);

        setMessages(cleanMsgs);

        setTimeout(() => {
          setJumpTargetId(targetId);
        }, 50);
      }
    } catch (err) {
      console.error("Jump Error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [roomId]);

  // 에러 화면
  if (errorReason) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-6 rounded-full bg-rose-100 p-5 text-rose-600">
          <ShieldAlert size={48} />
        </div>
        <h1 className="mb-2 text-2xl font-black text-slate-900">{errorReason.title}</h1>
        <p className="mb-8 text-slate-500 font-medium">{errorReason.desc}</p>
        <button 
          onClick={() => navigate('/')}
          className="rounded-xl bg-slate-900 px-8 py-3 font-black text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  // 로딩 뷰
  if (!room || !user) {
    return <div className="p-6 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Room...</div>;
  }

  const { sendMessage, sendImage, sendTyping, deleteMessage, kickUser, banUser } = actions;
  const isOwner = room.owner.id === user.id;

  return (
    <div className="flex h-full w-full bg-white text-slate-900 overflow-hidden">
      {/* 왼쪽 사이드바: 유저 목록 */}
      <aside className="flex w-1/5 flex-col border-r bg-white p-6">
        <div className="flex-1 overflow-y-auto">
          <UserList 
            users={roomUsers} 
            ownerId={room.owner.id} 
            currentUserId={user.id} 
            isOwner={isOwner} 
            onUserClick={setSelectedUserId}
            onKick={kickUser}
            onBan={(userId: number) => {
              const reason = prompt('밴 사유를 입력하세요') || '사유 없음';
              banUser(userId, reason);
            }}
          />
        </div>
      </aside>

      {/* 메인 섹션: 채팅창 */}
      <main className="flex flex-1 flex-col border-r border-slate-300 bg-white">
        <header className="flex h-[72px] shrink-0 items-center border-b border-slate-300 px-4 md:px-8 shadow-sm">
          {/* 왼쪽: 제목 영역*/}
          <div className="flex h-full w-1/2 items-center min-w-0 pr-4">
            <div className="flex flex-col min-w-0 w-full">
              <div className="flex items-center gap-1.5 w-full">
                <h1 className="truncate text-[18px] md:text-[19px] font-bold tracking-tight text-slate-900">
                  # {room.name}
                </h1>
              </div>
              
              <div className="flex items-center gap-2 mt-0.5 text-slate-500 overflow-hidden">
                <div className="flex shrink-0 items-center gap-1 text-[12px] md:text-[13px] font-semibold">
                  <Users size={14} strokeWidth={2.5} />
                  <span>{roomUsers.length}</span>
                </div>
                <span className="h-1 w-1 shrink-0 rounded-full bg-slate-200"></span>
                <div className="flex shrink-0 items-center gap-1 text-[12px] md:text-[13px] font-semibold text-emerald-500">
                  <Circle size={7} fill="currentColor" stroke="none" />
                  <span className="hidden sm:inline">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 버튼 영역 */}
          <div className="flex h-full w-1/2 items-center justify-end gap-1.5 md:gap-2 min-w-0">
            
            {/* 1. AI 요약 */}
            <button 
              onClick={() => setShowSummaryModal(true)}
              className="group flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white p-2 xl:px-3.5 xl:py-1.5 text-[13px] font-bold text-slate-700 hover:border-purple-200 hover:bg-purple-50 transition-all shadow-sm shrink"
            >
              <Sparkles size={16} className="shrink-0 text-purple-500" />
              <span className="hidden xl:inline whitespace-nowrap">AI Summary</span>
            </button>

            {isOwner && (
              <>
                {/* 2. 방 설정 */}
                <button 
                  onClick={() => setShowEditModal(true)} // navigate 대신 상태 변경
                  className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white p-2 xl:px-3.5 xl:py-1.5 text-[13px] font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm shrink"
                >
                  <Settings size={16} className="shrink-0 text-blue-500" />
                  <span className="hidden xl:inline whitespace-nowrap">Settings</span>
                </button>

                {/* 3. 밴 관리 */}
                <button 
                  onClick={() => setShowBanModal(true)} // navigate 대신 상태 변경
                  className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white p-2 xl:px-3.5 xl:py-1.5 text-[13px] font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm shrink"
                >
                  <Ban size={16} className="shrink-0 text-rose-500" />
                  <span className="hidden xl:inline whitespace-nowrap">Bans</span>
                </button>
              </>
            )}

            <div className="mx-0.5 h-4 w-[1px] bg-slate-100 shrink-0"></div>

            {/* 4. 나가기 버튼 (항상 아이콘) */}
            <button 
              onClick={() => navigate('/')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
              title="Exit Room"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* 메시지 리스트 영역 */}
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messages} 
            currentUserId={user.id} 
            roomId={room.id} 
            serverLastId={serverLastId}
            onLoadBefore={() => loadMessages('before')}
            onLoadRecent={() => loadMessages('recent')}
            onDelete={deleteMessage}
            onUserClick={setSelectedUserId}
            onImageClick={setSelectedImageUrl}
            jumpTargetId={jumpTargetId}
            onJumpComplete={() => setJumpTargetId(null)}
          />
        </div>

        {/* 메시지 입력 영역 */}
        <footer className="p-5 border-t border-slate-300"> 
          <MessageInput 
            roomId={room.id} 
            onSendText={sendMessage} 
            onSendImage={sendImage} 
            onTyping={sendTyping}
          />
        </footer>
      </main>

      {/* 오른쪽 사이드바: 검색 */}
      <aside className="flex w-1/4 flex-col bg-white p-6">
        {/* 6. 검색 리스트에 클릭 핸들러 전달 (컴포넌트 내부에서 구현되어야 함) */}
        <MessageSearchList 
          roomId={room.id} 
          onMessageClick={(msgId: number) => loadSearchedMessageAround(msgId)} 
        />
      </aside>

      {/* 모달창들 */}
      {showBanModal && (
        <RoomBanManagerModal 
          roomId={Number(roomId)} 
          roomName={room.name} 
          onClose={() => setShowBanModal(false)} 
        />
      )}

      {showEditModal && (
        <RoomEditModal 
          roomId={Number(roomId)} 
          onClose={() => setShowEditModal(false)} 
        />
      )}

      {showSummaryModal && (
        <SummaryModal 
          roomId={Number(roomId)} 
          isOpen={showSummaryModal} 
          onClose={() => setShowSummaryModal(false)} 
        />
      )}
      
      <UserInfoModal 
        userId={selectedUserId} 
        isOpen={!!selectedUserId} 
        onClose={() => setSelectedUserId(null)} 
        isOwner={isOwner} 
        currentUserId={user.id} 
        onKick={kickUser} 
        onBan={banUser}
      />
      
      <ImageModal 
        imageUrl={selectedImageUrl} 
        isOpen={!!selectedImageUrl} 
        onClose={() => setSelectedImageUrl(null)} 
      />
    </div>
  );
}