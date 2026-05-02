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
import { 
  ShieldAlert, Sparkles, LogOut, Circle, Settings, X, 
  Users, Search, ShieldCheck, MessageSquare 
} from 'lucide-react';
import { RoomManagementModal } from '../modals/RoomManagementModal';
import { RoomEditModal } from '../modals/RoomEditModal';
import { SummaryModal } from '../modals/SummaryModal';
import { RoomUserManagement } from '../components/chat/RoomUserManagement';
import { RoomUserList } from '../components/RoomUserList';

// 사이드바 탭 타입 정의
type TabType = 'users' | 'search' | 'settings' | 'management';

export function ChatRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 기존 상태들 유지
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [cachedSummary, setCachedSummary] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [serverLastId, setServerLastId] = useState(0);
  const [jumpTargetId, setJumpTargetId] = useState<number | null>(null);
  const [errorReason, setErrorReason] = useState<{ title: string; desc: string } | null>(null);

  // 레이아웃 전용 상태 추가
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [selectedManagementUser, setSelectedManagementUser] = useState<any>(null);

  const { messages, setMessages, roomUsers, typingUsers, actions } = useSocket(
    roomId, 
    room,
    user?.id
  );

  const { sendMessage, sendImage, sendTyping, deleteMessage, kickUser, banUser } = actions;
  const isOwner = room?.owner?.id === user?.id;

  // [기존 로직] 초기 데이터 및 밴 체크
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.bannedUntil) {
      const bannedUntil = new Date(user.bannedUntil);
      if (bannedUntil > new Date()) {
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
        setRoom(data);
      } catch (err) {
        setErrorReason({ title: "에러 발생", desc: `사유: ${err}` });
      }
    };

    fetchRoomData();
  }, [roomId, user, navigate]);

  const loadingRef = useRef(false);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // [기존 로직] 서버 메시지 마지막 ID 동기화
  useEffect(() => {
    if (messages.length > 0) {
      const lastId = Number(messages[messages.length - 1].id);
      setServerLastId(prev => Math.max(prev, lastId));
    }
  }, [messages]);

  // [기존 로직] 메시지 로드 (Pagination)
  const loadMessages = useCallback(async (direction: 'init' | 'before' | 'recent' = 'init') => {
    if (loadingRef.current || !roomId) return;
    const currentMsgs = messagesRef.current;
    const firstId = currentMsgs[0]?.id;
    const lastId = currentMsgs[currentMsgs.length - 1]?.id;

    let url = `/api/messages/${roomId}`;
    if (direction === 'before' && firstId) url += `?direction=before&cursor=${firstId}`;
    else if (direction === 'recent' && lastId) url += `?direction=recent&cursor=${lastId}`;

    try {
      loadingRef.current = true;
      setLoading(true);
      const msgs = await apiGet<any[]>(url);
      if (msgs && msgs.length > 0) {
        if (direction === 'init' || direction === 'recent') setServerLastId(Number(msgs[msgs.length - 1].id));
        setMessages(prev => {
          if (direction === 'before') return [...msgs, ...prev];
          if (direction === 'recent') return [...prev, ...msgs].slice(-200);
          return msgs;
        });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (user && roomId && room) loadMessages('init');
  }, [roomId, !!user, !!room, loadMessages]);

  // [기존 로직] 검색 메시지 위치 점프
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
        setTimeout(() => setJumpTargetId(targetId), 50);
      }
    } catch (err) {
      console.error("Jump Error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [roomId, setMessages]);

  // [기존 로직] AI 요약 요청
  const handleRequestSummary = async () => {
    if (summaryStatus === 'loading') return;
    setSummaryStatus('loading');
    setShowToast(true);
    try {
      const data = await apiGet<{ summary: string }>(`/api/messages/${roomId}/summary`);
      setCachedSummary(data?.summary || '');
      setSummaryStatus('done');
    } catch (err) {
      setSummaryStatus('idle');
      setShowToast(false);
      alert('AI 서버 응답이 지연되고 있습니다.');
    }
  };

  if (errorReason) return <ErrorView reason={errorReason} onBack={() => navigate('/')} />;
  if (!room || !user) return <div className="p-6 font-black animate-pulse">LOADING...</div>;

  return (
    <div className="flex h-full w-full bg-white text-slate-900 overflow-hidden font-sans">
      
      {/* 좌측, 탭 콘텐츠 영역 */}
      <aside className="flex w-[25%] min-w-[340px] flex-col border-r border-slate-200 bg-white">
        <header className="h-[72px] flex items-center px-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
            {activeTab === 'users' && '참여자 목록'}
            {activeTab === 'search' && '메시지 검색'}
            {activeTab === 'settings' && '방 설정'}
            {activeTab === 'management' && '권한 / 상태 관리'}
          </h2>
        </header>

        {/* 탭 본문 내용 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'users' && (
            <div className="p-4">
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
          )}
          {activeTab === 'search' && (
            <div className="p-4">
              <MessageSearchList 
                roomId={room.id} 
                onMessageClick={(msgId: number) => loadSearchedMessageAround(msgId)} 
              />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center">
              <Settings size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold mb-4">방 정보를 수정하시겠습니까?</p>
              <button 
                onClick={() => setShowEditModal(true)}
                className="rounded-xl bg-slate-900 px-6 py-3 font-black text-white hover:bg-slate-800 transition-all"
              >
                설정 모달 열기
              </button>
            </div>
          )}
          {/* {activeTab === 'management' ? (
            selectedManagementUser ? (
              <RoomUserManagement 
                roomId={Number(roomId)} 
                user={selectedManagementUser} 
                onBack={() => setSelectedManagementUser(null)} 
              />
            ) : (
              <RoomUserList 
                roomId={Number(roomId)} 
                onSelectUser={(u) => setSelectedManagementUser(u)} 
              />
            )
          ) : null} */}
        </div>

        {/* 하단 탭 내비게이션 */}
        <nav className="h-[84px] border-t border-slate-100 bg-slate-50 flex items-center justify-around px-4">
          <TabNavBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={20} />} label="Users" />
          <TabNavBtn active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={<Search size={20} />} label="Search" />
          <TabNavBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Settings" />
          {isOwner && (
            <TabNavBtn 
              active={activeTab === 'management'} 
              onClick={() => { setActiveTab('management'); setSelectedManagementUser(null); }} 
              icon={<ShieldCheck size={20} />} 
              label="Admin" 
              color="rose" 
            />
          )}
        </nav>
      </aside>

      {/* 우측, 채팅창 영역 */}
      <main className="relative flex flex-1 flex-col bg-white overflow-hidden">
        
        {/* 헤더 */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-8 shadow-sm z-20 bg-white">
          <div className="flex flex-col">
            <h1 className="text-[19px] font-black text-slate-900 tracking-tight"># {room.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 font-bold">
              <Circle size={7} fill="#10b981" className="text-emerald-500" />
              <span className="text-[12px] text-slate-400 uppercase tracking-wider">{roomUsers.length} MEMBERS ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleRequestSummary}
              disabled={summaryStatus === 'loading'}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-700 hover:bg-purple-50 hover:border-purple-200 transition-all disabled:opacity-50"
            >
              <Sparkles size={16} className={summaryStatus === 'loading' ? 'animate-spin' : 'text-purple-500'} />
              AI SUMMARY
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* AI 요약 알림 */}
        {showToast && (
          <div className="absolute top-16 left-0 right-0 z-30 flex h-14 w-full items-center justify-between px-6 bg-blue-50/95 border-b border-blue-100 backdrop-blur-md animate-in slide-in-from-top">
            
            {/* 왼쪽: 상태 아이콘 + 메시지 */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-blue-100">
                <Sparkles size={16} className={summaryStatus === 'loading' ? 'animate-spin text-blue-400' : 'text-blue-500'} />
              </div>
              <span className="text-[13px] font-bold text-blue-900">
                {summaryStatus === 'loading' ? "대화 내용을 분석하고 있습니다..." : "대화 요약이 준비되었습니다."}
              </span>
            </div>

            {/* 오른쪽: 버튼 그룹 */}
            <div className="flex items-center gap-4">
              {summaryStatus === 'done' && (
                <button 
                  onClick={() => setShowSummaryModal(true)} 
                  className="text-[13px] font-black text-blue-600 hover:text-blue-700 underline underline-offset-4"
                >
                  VIEW SUMMARY
                </button>
              )}
              <button 
                onClick={() => { setShowToast(false); setSummaryStatus('idle'); }} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 메시지 리스트 */}
        <div className="flex-1 relative overflow-hidden bg-slate-50/30">
          <MessageList 
            messages={messages} currentUserId={user.id} roomId={room.id} serverLastId={serverLastId}
            onLoadBefore={() => loadMessages('before')} onLoadRecent={() => loadMessages('recent')}
            onDelete={deleteMessage} onUserClick={setSelectedUserId} onImageClick={setSelectedImageUrl}
            jumpTargetId={jumpTargetId} onJumpComplete={() => setJumpTargetId(null)}
          />
        </div>

        {/* 입력 푸터 */}
        <footer className="p-6 border-t border-slate-200 bg-white">
          <MessageInput roomId={room.id} onSendText={sendMessage} onSendImage={sendImage} onTyping={sendTyping} />
        </footer>
      </main>

      {/* [모달 모음 - 기존 유지] */}
      {showBanModal && <RoomManagementModal roomId={Number(roomId)} roomName={room.name} onClose={() => setShowBanModal(false)} />}
      {showEditModal && <RoomEditModal roomId={Number(roomId)} onClose={() => setShowEditModal(false)} />}
      {showSummaryModal && <SummaryModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)} summary={cachedSummary} />}
      <UserInfoModal userId={selectedUserId} isOpen={!!selectedUserId} onClose={() => setSelectedUserId(null)} isOwner={isOwner} currentUserId={user.id} onKick={kickUser} onBan={banUser} />
      <ImageModal imageUrl={selectedImageUrl} isOpen={!!selectedImageUrl} onClose={() => setSelectedImageUrl(null)} />
    </div>
  );
}

// 하단 내비게이션 버튼 컴포넌트
function TabNavBtn({ active, onClick, icon, label, color = 'indigo' }: any) {
  const activeStyles = active 
    ? `bg-white text-${color === 'rose' ? 'rose' : 'indigo'}-600 shadow-sm border-slate-200` 
    : `text-slate-400 hover:text-slate-600 border-transparent`;
  
  return (
    <button 
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-1.5 py-2.5 mx-1 rounded-2xl border transition-all ${activeStyles}`}
    >
      <div className={active ? 'scale-110 transition-transform' : ''}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
    </button>
  );
}

// 에러 뷰 서브 컴포넌트
function ErrorView({ reason, onBack }: any) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="mb-6 rounded-3xl bg-rose-100 p-6 text-rose-600 shadow-inner"><ShieldAlert size={64} /></div>
      <h1 className="mb-2 text-3xl font-black text-slate-900 uppercase tracking-tighter">{reason.title}</h1>
      <p className="mb-8 text-slate-500 font-bold">{reason.desc}</p>
      <button onClick={onBack} className="rounded-2xl bg-slate-900 px-10 py-4 font-black text-white shadow-2xl hover:bg-slate-800 active:scale-95 transition-all">BACK TO MAIN</button>
    </div>
  );
}