let socket = null;
let currentRoomId = null;

export async function renderChatRoom(container, user, roomId) {
  if (!user) {
    location.hash = '#/login';
    return;
  }

  currentRoomId = roomId;

  // XSS 방지 함수
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 시스템 알림 함수
  function showSystemAlert(message) {
    const systemContainer = document.getElementById('system-alerts');
    if (!systemContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-info alert-dismissible fade show shadow-sm mt-2`;
    alert.role = 'alert';
    alert.innerHTML = `
      <strong>${escapeHtml(message)}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    systemContainer.prepend(alert);

    // 최대 4개까지
    while (systemContainer.children.length > 4) {
      systemContainer.removeChild(systemContainer.lastChild);
    }

    // 3초 후 자동 제거
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }, 2000);
  }

  try {
    // 방 정보 조회
    const roomResponse = await fetch(`/rooms/${encodeURIComponent(roomId)}`, {
      method: 'GET',
      credentials: 'include',
    });
    const room = await roomResponse.json();
    if (!roomResponse.ok) {
      container.textContent = '존재하지 않거나 접근할 수 없는 방입니다.';
      return;
    }

    // DOM 구성
    container.innerHTML = `
      <h3 class="mb-3 text-dark fw-semibold">${escapeHtml(room.name)}</h3>
      <div class="d-flex gap-3 p-3 bg-secondary bg-opacity-10 rounded shadow-sm">
        <div class="flex-grow-1 position-relative">
          <!-- 시스템 알림 영역 -->
          <div id="system-alerts" class="position-absolute top-0 start-0 w-100 px-3 mt-2" style="z-index: 1050;"></div>

          <!-- 채팅 메시지 영역 -->
          <div id="chat-messages" class="border rounded p-2 overflow-auto" style="height: 400px; background-color: #fff;">
            <ul id="messages-list" class="list-group list-group-flush"></ul>
          </div>
        </div>

        <!-- 유저 목록 영역 -->
        <div id="chat-users" class="border rounded p-2 bg-gray" style="height: 400px; width: 300px; overflow-y: auto;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>참여자</strong>
            <span id="user-count" class="badge bg-primary rounded-pill">0 / ${escapeHtml(room.maxMembers)}</span>
          </div>
          <ul id="users-list" class="list-group"></ul>
        </div>
      </div>

      <div class="mt-3 hstack gap-3">
      <textarea id="chat-input"
        class="form-control me-auto"
        placeholder="메시지를 입력하세요"
        aria-label="메시지를 입력하세요"
        rows="1"
        style="max-height: 7.5em; resize: none; overflow-y: auto;"></textarea>
        <button type="button" id="chat-submit" class="btn btn-outline-primary align-self-start">Submit</button>
        <button type="button" id="chat-reset" class="btn btn-outline-danger align-self-start">Reset</button>
      </div>
    
    `;

    const userList = document.getElementById('users-list');
    const chatMessages = document.getElementById('chat-messages');
    const messagesList = document.getElementById('messages-list');
    const chatInput = document.getElementById('chat-input');
    const chatSubmit = document.getElementById('chat-submit');
    const chatReset = document.getElementById('chat-reset');

    // Socket.io 연결
    socket = io('http://localhost:4000', { 
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socket.emit('joinRoom', { roomId });

    // [강제 연결 끊김 이벤트]
    socket.on('forcedDisconnect', data => {
      container.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center mt-4" role="alert">
        <div>
          ${escapeHtml(data.msg)}
        </div>
      </div>
    `;
    })

    // [공용 UI 소켓 이벤트]
    socket.on('systemMessage', data => {
      // 입/퇴장 메시지 표시
      showSystemAlert(data.msg);

      // 접속 유저 표시
      userList.innerHTML = '';
      data.roomUsers.forEach(u => {
        const li = document.createElement('li');
        li.textContent = u.username;
        li.classList.add('list-group-item','list-group-item-primary');
        userList.appendChild(li);
      });

      // 접속 인원수 표시
      const userCount = document.getElementById('user-count');
      userCount.textContent = `${escapeHtml(data.roomUserCount)} / ${escapeHtml(room.maxMembers)}`;
    });

    // 새 채팅 메시지 출력
    socket.on('chatMessage', data => {
      const createdAt = new Date().toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });

      const li = document.createElement('li');
      li.classList.add('list-group-item');

      const isMine = data.user.id === user.id;
      if (isMine) li.classList.add('bg-light');

      li.innerHTML = `
        <div class="d-flex justify-content-between">
          <div class="me-2">
            <strong class="text-${isMine ? 'primary' : 'dark'}">${escapeHtml(data.user.username)}</strong><br>
            <div style="white-space: pre-wrap; word-break: break-word">${escapeHtml(data.content)}</div>
          </div>
          <small class="text-muted flex-shrink-0 ms-2">${createdAt}</small>
        </div>
      `;
      messagesList.appendChild(li);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // 기존 채팅 메시지 조회
    const MessagesResponse = await fetch(`/messages/${encodeURIComponent(roomId)}`, {
      method: 'GET'
    });
    const messages = await MessagesResponse.json();

    messages.forEach(msg => {
      const createdAt = new Date(msg.created_at).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });

      const li = document.createElement('li');
      li.classList.add('list-group-item');

      const isMine = msg.user.id === user.id;
      if (isMine) li.classList.add('bg-light');

      li.innerHTML = `
        <div class="d-flex justify-content-between">
          <div class="me-2">
            <strong class="text-${isMine ? 'primary' : 'dark'}">${escapeHtml(msg.user.username)}</strong><br>
            <div style="white-space: pre-wrap; word-break: break-word">${escapeHtml(msg.content)}</div>
          </div>
          <small class="text-muted flex-shrink-0 ms-2">${createdAt}</small>
        </div>
      `;
      messagesList.appendChild(li);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 입력 칸 높이 조절 함수
    function resizeTextarea() {
      chatInput.style.height = "auto";
      const lineHeight = 24; // 1줄 높이(px)
      const maxHeight = lineHeight * 5;
    
      if (chatInput.scrollHeight > maxHeight) {
        chatInput.style.height = maxHeight + "px";
        chatInput.style.overflowY = "auto";
      } else {
        chatInput.style.height = chatInput.scrollHeight + "px";
        chatInput.style.overflowY = "hidden";
      }
    }
    chatInput.addEventListener("input", resizeTextarea);

    // 메시지 전송
    chatSubmit.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    function sendMessage() {
      const content = chatInput.value;
      if (!content) return;

      socket.emit('sendMessage', { roomId, content });
      chatInput.value = '';
      resizeTextarea();
    }
    
    // 메시지 리셋
    chatReset.addEventListener('click', () => {
      chatInput.value = '';
      resizeTextarea();
    });
  } catch (err) {
    container.textContent = `서버 에러가 발생했습니다. ${err}`;
  }
}

// 채팅방 나가기
export function leaveChatRoom() {
  if (socket && currentRoomId) {
    socket.emit('leaveRoom', { roomId: currentRoomId });
    socket.off();
    socket.disconnect();
    socket = null;
  }
}
