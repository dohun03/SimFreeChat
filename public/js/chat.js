import { escapeHtml, formatDate } from './app.js'

let socket = null;
let currentRoomId = null;

export async function renderChatRoom(container, user, roomId) {
  if (!user) {
    location.hash = '#/login';
    return;
  }

  currentRoomId = roomId;

  // 시스템 알림 함수
  function showSystemMessage(message) {
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

  function showErrorMessage(message) {
    container.innerHTML = `
    <div class="alert alert-danger d-flex align-items-center mt-4" role="alert">
      <div>
        ${escapeHtml(message)}
      </div>
    </div>
    `;
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
    const isOwner = room.owner.id===user.id;

    container.innerHTML = `
      <div class="mt-3 hstack gap-3">
        <h3 id="room-name" class="mb-3 text-dark fw-semibold">${escapeHtml(room.name)}</h3>
        <button type="button" id="chat-edit" class="btn btn-sm btn-primary align-self-start ${isOwner ? '' : 'd-none'}">수정</button>
      </div>
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
        <div id="chat-users" class="border rounded p-2 bg-gray" style="height: 400px; min-width: 200px; overflow-y: auto;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>참여자</strong>
            <span id="user-count" class="badge bg-primary rounded-pill">
              <span id="current-count">0</span> /
              <span id="max-count">${escapeHtml(room.maxMembers)}</span>
            </span>
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

    const roomName = document.getElementById('room-name');
    const userList = document.getElementById('users-list');
    const currentCount = document.getElementById('current-count');
    const maxCount = document.getElementById('max-count');
    const chatMessages = document.getElementById('chat-messages');
    const messagesList = document.getElementById('messages-list');
    const chatInput = document.getElementById('chat-input');
    const chatSubmit = document.getElementById('chat-submit');
    const chatReset = document.getElementById('chat-reset');
    const chatEdit = document.getElementById('chat-edit');

    // Socket.io 연결
    socket = io('http://localhost:4000', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    if (room.currentMembers>=room.maxMembers) {
      showErrorMessage('방의 인원이 가득 찼습니다.');
      return;
    }

    if (room.password && !isOwner) {
      const password = prompt('비밀번호를 입력하세요');
      if (!password) {
        showErrorMessage('비밀번호를 입력하세요.');
        return;
      }
      socket.emit('joinRoom', { roomId, password });
    } else {
      socket.emit('joinRoom', { roomId });
    }

    // // 1. 소켓 초기화 직후에 이벤트 추가
    // socket.on('disconnect', (reason) => {
    //   console.log('서버 연결 끊김:', reason);
    //   showSystemMessage('서버와의 연결이 끊어졌습니다. 재연결 시도 중...');
    //   attemptReconnect();
    // });

    // socket.on('connect_error', (err) => {
    //   console.log('연결 에러:', err);
    //   showSystemMessage('서버 연결 오류. 재연결 시도 중...');
    //   attemptReconnect();
    // });

    // // 2. 재연결 함수
    // function attemptReconnect() {
    //   if (socket && !socket.connected) {
    //     console.log('재연결 시도...');
    //     socket.connect();
    //   }
    // }

    // // 3. 브라우저 탭 활성화 감지
    // document.addEventListener('visibilitychange', () => {
    //   if (document.visibilityState === 'visible' && socket && !socket.connected) {
    //     console.log('탭 활성화 - 소켓 재연결 시도...');
    //     showSystemMessage('채팅 탭이 활성화되었습니다. 서버와 재연결 중...');
    //     socket.connect();
    //   }
    // });
    
    // [강제 연결 끊김 Event]
    socket.on('forcedDisconnect', data => {
      showErrorMessage(data.msg);
    });

    // [방 수정 Event]
    socket.on('roomUpdated', data => {
      showSystemMessage(data.msg);
      roomName.textContent = data.room.name;
      maxCount.textContent = data.room.maxMembers;
    });

    // [공용 UI 소켓 Event]
    socket.on('systemMessage', data => {
      // 입/퇴장 메시지 표시
      showSystemMessage(data.msg);
    
      // 접속 유저 표시
      userList.innerHTML = '';
      data.roomUsers.forEach(u => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'list-group-item-primary');
    
        // 유저 이름
        const nameSpan = document.createElement('span');
        nameSpan.textContent = u.username;
    
        // 방장일 경우
        if (room.owner.id === u.id) {
          const badge = document.createElement('span');
          badge.className = 'badge bg-danger ms-2';
          badge.textContent = '방장';
          nameSpan.appendChild(badge);
        }
    
        // 드롭다운 메뉴
        const dropdownDiv = document.createElement('div');
        dropdownDiv.className = 'dropdown';
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'btn p-0 border-0 bg-transparent shadow-none';
        dropdownBtn.type = 'button';
        dropdownBtn.setAttribute('data-bs-toggle', 'dropdown');
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownBtn.innerHTML = `<i class="bi bi-three-dots-vertical text-secondary"></i>`;
        const dropdownMenu = document.createElement('ul');
        dropdownMenu.className = 'dropdown-menu dropdown-menu-end';
        dropdownMenu.innerHTML = `
          <li><button class="dropdown-item user-info-btn" data-id="${u.id}">정보</button></li>
          ${isOwner && room.owner.id!=u.id?
          `<li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger kick-user-btn" data-id="${u.id}">강퇴</button></li>` : ''}
        `;
        
        dropdownDiv.appendChild(dropdownBtn);
        dropdownDiv.appendChild(dropdownMenu);
    
        li.appendChild(nameSpan);
        li.appendChild(dropdownDiv);
        userList.appendChild(li);
      });
    
      // 접속 인원수 표시
      currentCount.textContent = data.roomUserCount;

      userList.querySelectorAll('.kick-user-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const targetId = e.target.dataset.id;
          if (confirm('정말 이 사용자를 강퇴하시겠습니까?')) {
            socket.emit('kickUser', { roomId, userId: Number(targetId) });
          }
        });
      });

      // userList.querySelectorAll('.user-info-btn').forEach(btn => {
      //   btn.addEventListener('click', e => {
      //     const targetId = e.target.dataset.id;
      //     showSystemMessage(`유저 ID: ${targetId}`);
      //   });
      // });
    });

    // [새 채팅 메시지 출력 Event]
    socket.on('chatMessage', data => {
      const createdAt = formatDate(data.created_at);

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
      const createdAt = formatDate(msg.created_at);

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

    // 채팅방 수정 페이지
    chatEdit.addEventListener('click', () => {
      window.open(`#/edit-room/${roomId}`, '_blank');
    })
  } catch (err) {
    container.textContent = `서버 에러가 발생했습니다. ${err}`;
  }
}

// 채팅방 나가기
export function leaveChatRoom() {
  if (socket && currentRoomId) {
    console.log("방 나가기");
    socket.emit('leaveRoom', { roomId: currentRoomId });
    socket.off();
    socket.disconnect();
    socket = null;
  }
}
