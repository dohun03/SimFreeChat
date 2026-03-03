import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '../components/chat/MessageList';

export function useSocket(roomId: string | undefined, room: any, currentUserId: number | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId || !room || !currentUserId) return;

    // 만약 기존 소켓이 있다면 먼저 확실히 죽임
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io('/', {
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      const isOwner = room.owner.id === currentUserId;
      const joinPayload: any = { roomId: Number(roomId) };

      if (room.password && !isOwner) {
        const inputPassword = prompt('비밀번호를 입력하세요');
        if (inputPassword === null) {
          window.location.href = '/';
          return;
        }
        joinPayload.password = inputPassword;
      }

      socket.emit('joinRoom', joinPayload);
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'Authentication failed') {
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
      }
    });

    socket.on('roomEvent', (data) => {
      setRoomUsers(data.roomUsers || []);
    });
    
    socket.on('messageCreate', (data) => {
      setMessages((prev) => [...prev, data.message].slice(-200));
    });

    socket.on('messageDeleted', (id: number) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isDeleted: true } : m)));
    });

    socket.on('typing', ({ userName, isTyping }: { userName: string, isTyping: boolean }) => {
      setTypingUsers(prev => 
        isTyping ? [...new Set([...prev, userName])] : prev.filter(u => u !== userName)
      );
    });

    socket.on('forcedDisconnect', (data) => {
      alert(data.msg);
      window.location.href = '/';
    });

    socket.on('exception', (data) => alert(`에러: ${data.message}`));

    return () => {
      if (socket.connected) {
        socket.emit('leaveRoom', { roomId: Number(roomId) });
      }
      socket.disconnect(); 
      socketRef.current = null;
    };
  }, [roomId, currentUserId, !!room]);

  const sendMessage = useCallback((content: string) => {
    socketRef.current?.emit('sendMessage', { roomId: Number(roomId), content, type: 'text' });
  }, [roomId]);

  const sendImage = useCallback((filename: string) => {
    socketRef.current?.emit('sendMessage', { roomId: Number(roomId), content: filename, type: 'image' });
  }, [roomId]);

  const deleteMessage = useCallback((messageId: number) => {
    socketRef.current?.emit('deleteMessage', { roomId: Number(roomId), messageId });
  }, [roomId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit('typing', { roomId: Number(roomId), isTyping });
  }, [roomId]);

  const kickUser = useCallback((userId: number) => {
    socketRef.current?.emit('kickUser', { roomId: Number(roomId), userId });
  }, [roomId]);

  const banUser = useCallback((userId: number, banReason: string) => {
    socketRef.current?.emit('banUser', { roomId: Number(roomId), userId, banReason });
  }, [roomId]);

  return {
    messages,
    setMessages,
    roomUsers,
    typingUsers,
    actions: useMemo(() => ({ 
      sendMessage, sendImage, deleteMessage, sendTyping, kickUser, banUser 
    }), [sendMessage, sendImage, deleteMessage, sendTyping, kickUser, banUser])
  };
}