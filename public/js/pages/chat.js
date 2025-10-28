import { escapeHtml, formatDate, router } from '../app.js'

let socket = null;
let currentRoomId = null;

function closeSocketConnection() {
  if (socket) {
    socket.off();
    socket.disconnect();
    socket = null;
    console.log('소켓 연결 종료됨');
  }
}

export async function renderChatRoom(container, user, roomId) {
  if (!user) {
    history.pushState(null, '', '/login');
    await router();
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

  function createMessageElement(msg, currentUserId) {
    const createdAt = formatDate(msg.createdAt);
    const isMine = msg.user.id === currentUserId;
  
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'chat-message', 'position-relative', 'py-2');
    li.dataset.id = msg.id;
  
    if (isMine) li.classList.add('bg-light', 'mine');
  
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1 me-4">
          <small class="text-muted d-block mb-1">${createdAt}</small>
          <strong class="text-${isMine ? 'primary' : 'dark'} d-block">${escapeHtml(msg.user.name)}</strong>
          <div class="chat-content">${msg.isDeleted ? 
            '<span class="chat-content text-muted fst-italic small">삭제된 메시지입니다.</span>' : escapeHtml(msg.content)
          }
          </div>
        </div>
      </div>
      ${isMine && !msg.isDeleted ? 
        `<button class="btn btn-sm btn-outline-danger delete-btn position-absolute top-0 end-0 mt-1 me-1" style="opacity: 0; transition: opacity 0.2s;">
          <i class="bi bi-trash"></i>
        </button>` : ''
      }
    `;
  
    // 내용 스타일
    const contentDiv = li.querySelector('.chat-content');
    contentDiv.style.whiteSpace = 'pre-line';
    contentDiv.style.wordBreak = 'break-word';
  
    // 삭제 버튼 표시
    if (isMine) {
      const deleteBtn = li.querySelector('.delete-btn');
      if (!deleteBtn) return li;

      li.addEventListener('mouseenter', () => (deleteBtn.style.opacity = '1'));
      li.addEventListener('mouseleave', () => (deleteBtn.style.opacity = '0'));
    }
  
    return li;
  }

  try {
    // 방 정보 조회
    const roomRes = await fetch(`/api/rooms/${roomId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!roomRes.ok) {
      container.textContent = '존재하지 않거나 접근할 수 없는 방입니다.';
      return;
    }
    const room = await roomRes.json();
    const isOwner = room.owner.id===user.id;
    
    // 밴 정보 조회
    const bannedUsersRes = await fetch(`/api/room-users/${roomId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!bannedUsersRes.ok) {
      container.textContent = '존재하지 않거나 접근할 수 없는 방입니다.';
      return;
    }
    const bannedUsers = await bannedUsersRes.json();
    let isBanned = false;
    let banReason = '';
    bannedUsers.forEach(b => {
      if (b.user.id===user.id) {
        isBanned = true;
        banReason = b.banReason
      }
    });

    container.innerHTML = `
      <div class="mt-3 mb-2 d-flex justify-content-between align-items-center">
        <!-- 왼쪽: 제목 + 수정 버튼 -->
        <div class="d-flex align-items-center gap-2">
          <h3 id="room-name" class="mb-0 text-dark fw-semibold">${escapeHtml(room.name)}</h3>
          <button type="button" id="room-edit" class="btn btn-sm btn-primary ${isOwner ? '' : 'd-none'}">채팅방 관리</button>
          <button type="button" id="room-ban-manager" class="btn btn-sm btn-danger ${isOwner ? '' : 'd-none'}">채팅방 밴 관리</button>
        </div>

        <!-- 오른쪽: 검색창 -->
        <div class="input-group input-group-sm" style="width: 300px;">
          <div class="btn-group-vertical">
            <button class="btn btn-outline-secondary btn-sm" type="button" id="search-up" style="padding: 0.25rem 0.35rem; font-size: 0.7rem;">
              <i class="bi bi-chevron-up"></i>
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" id="search-down" style="padding: 0.25rem 0.35rem; font-size: 0.7rem;">
              <i class="bi bi-chevron-down"></i>
            </button>
          </div>
      
          <input type="text" class="form-control" placeholder="메시지 검색..." id="chat-search" maxlength="20">
          <button class="btn btn-outline-secondary" type="button"  id="chat-search-submit">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>

      <div class="d-flex gap-3 p-3 bg-secondary bg-opacity-10 rounded shadow-sm">
        <div class="flex-grow-1 position-relative">
          <!-- 시스템 알림 영역 -->
          <div id="system-alerts" class="position-absolute top-0 start-0 w-100 px-3 mt-2" style="z-index: 1050;"></div>

          <!-- 채팅 메시지 영역 -->
          <div id="chat-messages" class="border rounded p-2 overflow-auto" style="height: 600px; background-color: #fff;">
            <ul id="messages-list" class="list-group list-group-flush"></ul>
          </div>
        </div>

        <!-- 유저 목록 영역 -->
        <div id="chat-users" class="border rounded p-2 bg-gray" style="height: 600px; min-width: 200px; overflow-y: auto;">
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

      <!-- 유저 정보 모달 -->
      <div class="modal fade" id="userInfoModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">사용자 정보</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p><strong>아이디:</strong> <span id="modal-name"></span></p>
              <p><strong>이메일:</strong> <span id="modal-email"></span></p>
              <p><strong>가입일:</strong> <span id="modal-created"></span></p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
            </div>
          </div>
        </div>
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
    const chatSearchInput = document.getElementById('chat-search');
    const chatSearchSubmit = document.getElementById('chat-search-submit');
    const chatSearchUp = document.getElementById('search-up');
    const chatSearchDown = document.getElementById('search-down');
    const roomEdit = document.getElementById('room-edit');
    const roomBanManager = document.getElementById('room-ban-manager');

    // Socket.io 연결
    socket = io('http://25.9.141.41:4000', {
      withCredentials: true,
      // reconnection: true,
      // reconnectionAttempts: 10,
      // reconnectionDelay: 2000,
    });

    if (isBanned) {
      showErrorMessage(`이 방에서 밴 처리된 사용자입니다: ${banReason}`);
      closeSocketConnection();
      return;
    }

    if (room.currentMembers>=room.maxMembers) {
      showErrorMessage('방의 인원이 가득 찼습니다.');
      closeSocketConnection();
      return;
    }

    if (room.password && !isOwner) {
      const password = prompt('비밀번호를 입력하세요');
      if (!password) {
        showErrorMessage('비밀번호를 입력하세요.');
        closeSocketConnection();
        return;
      }
      socket.emit('joinRoom', { roomId, password });
    } else {
      socket.emit('joinRoom', { roomId });
    }

    // [서버와 연결 끊김 Event]
    socket.on('disconnect', (reason) => {
      showErrorMessage(`SERVER: ${reason}`);
      socket.off();
      socket = null;
    });
    
    // [수동으로 서버와 연결 끊김 Event]
    socket.on('forcedDisconnect', (data) => {
      showErrorMessage(`SERVER: ${data.msg}`);
      socket.off();
      socket = null;
    });

    // [방 수정 Event]
    socket.on('roomUpdated', data => {
      showSystemMessage(data.msg);
      roomName.textContent = data.room.name;
      maxCount.textContent = data.room.maxMembers;
    });

    // [공용 UI 소켓 Event]
    socket.on('roomEvent', data => {
      // 입/퇴장 메시지 표시
      showSystemMessage(data.msg);
    
      // 접속 유저 표시
      userList.innerHTML = '';
      data.roomUsers.forEach(u => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'list-group-item-primary');
    
        // 유저 이름
        const nameSpan = document.createElement('span');
        nameSpan.textContent = u.name;
    
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
          <li><button class="dropdown-item user-info-btn" data-id="${u.id}">사용자 정보</button></li>
          ${isOwner && room.owner.id!=u.id ?
          `<li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger kick-user-btn" data-id="${u.id}">강퇴</button></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger ban-user-btn" data-id="${u.id}">밴</button></li>` : ''}
        `;
        
        dropdownDiv.appendChild(dropdownBtn);
        dropdownDiv.appendChild(dropdownMenu);
    
        li.appendChild(nameSpan);
        li.appendChild(dropdownDiv);
        userList.appendChild(li);
      });
    
      // 접속 인원수 표시
      currentCount.textContent = data.roomUserCount;

      // 사용자 정보 버튼
      userList.querySelectorAll('.user-info-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const targetId = Number(e.target.dataset.id);
          try {
            const res = await fetch(`/api/users/${targetId}`, {
              method: 'GET'
            });
            if (!res.ok) throw new Error('유저 정보를 가져올 수 없습니다.');
            const targetUser = await res.json();
      
            document.getElementById('modal-name').textContent = targetUser.name;
            document.getElementById('modal-email').textContent = targetUser.email || '-';
            document.getElementById('modal-created').textContent = formatDate(targetUser.createdAt);
      
            const modalEl = document.getElementById('userInfoModal');
            const modal = new bootstrap.Modal(document.getElementById('userInfoModal'));
            modal.show();
      
            // 모달 닫히면 입력창 포커스
            modalEl.addEventListener('hidden.bs.modal', () => {
              chatInput.focus();
            });
          } catch (err) {
            showSystemMessage(err.message);
          }
        });
      });

      // 사용자 강퇴 버튼
      userList.querySelectorAll('.kick-user-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const targetId = e.target.dataset.id;
          if (confirm('정말 이 사용자를 강퇴하시겠습니까?')) {
            socket.emit('kickUser', { roomId, userId: Number(targetId) });
          }
        });
      });

      // 사용자 밴 버튼
      userList.querySelectorAll('.ban-user-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const targetId = Number(e.target.dataset.id);
      
          const banReason = prompt('사용자를 밴하시겠습니까?\n밴 사유를 입력하세요:');
          if (!banReason) return;
      
          socket.emit('banUser', { roomId, userId: targetId, banReason });
        });
      });
    });

    // 기존 채팅 메시지 조회
    const res = await fetch(`/api/messages/${roomId}`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error('메시지를 불러오는 중 오류가 발생했습니다.');
    
    const messages = await res.json();

    messages.forEach(msg => {
      const li = createMessageElement(msg, user.id);
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
    chatInput.addEventListener('input', resizeTextarea);

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

    // [새 채팅 메시지 출력 Event]
    socket.on('messageCreated', data => {
      const li = createMessageElement(data, user.id);
      messagesList.appendChild(li);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // 메시지 리셋
    chatReset.addEventListener('click', () => {
      chatInput.value = '';
      resizeTextarea();
    });

    // 메시지 삭제
    messagesList.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-btn');
      if (!deleteBtn) return;
    
      const messageItem = deleteBtn.closest('.chat-message');
      const messageId = messageItem.dataset.id;
    
      if (confirm('이 메시지를 삭제하시겠습니까?')) {
        socket.emit('deleteMessage', { roomId, messageId });
      }
    });

    // [메시지 삭제 Event]
    socket.on('messageDeleted', messageId => {
      showSystemMessage(`${messageId}번 메시지가 삭제되었습니다.`);
      const content = document.querySelector(`li[data-id="${messageId}"] .chat-content`);
      content.innerHTML = '<span class="chat-content text-muted fst-italic small">삭제된 메시지입니다.</span>';
    });

    // 메시지 검색
    chatSearchSubmit.addEventListener('click', searchMessage);
    chatSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchMessage();
      }
    });

    let searchArray;
    let searchStatus = 0;
    
    async function searchMessage() {
      const search = chatSearchInput.value.trim();
      if (!search) {
        showSystemMessage('검색어를 입력하세요.');
        return;
      }
      
      try {
        searchStatus = 0;

        const res = await fetch(`/api/messages/${roomId}?search=${encodeURIComponent(search)}`, {
          method: 'GET'
        });
        if (!res.ok) throw new Error('메시지를 불러오는 중 오류가 발생했습니다.');

        const messages = await res.json();
        if (messages.length===0) {
          showSystemMessage('검색 결과가 없습니다.');
          return;
        }

        searchArray = messages;
        
        const firstMessageId = searchArray[searchStatus].id;
        highlightMessage(firstMessageId);
      } catch (err) {
        console.log('서버 에러:', err);
      }
    }

    // 메시지 검색 하이라이트
    function highlightMessage(targetId) {
      // 이전 하이라이트 제거
      document.querySelectorAll('.border-warning').forEach(el => {
        el.classList.remove('border', 'border-warning', 'border-3', 'rounded-3');
      });

      const target = document.querySelector(`[data-id="${targetId}"]`);
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('border', 'border-warning', 'border-3', 'rounded-3');

      setTimeout(() => {
        target.classList.remove('border', 'border-warning', 'border-3', 'rounded-3');
      }, 3000);
    }

    // 메시지 검색 위로 이동 버튼
    chatSearchUp.addEventListener('click', () => {
      if (!searchArray || searchArray.length === 0) {
        showSystemMessage('검색 결과가 없습니다.');
        return;
      }
      searchStatus++;
      if (searchStatus >= searchArray.length) {
        showSystemMessage('마지막 검색 결과입니다.');
        searchStatus--;
        return;
      }

      const targetId = searchArray[searchStatus].id;
      highlightMessage(targetId);
    });

    // 메시지 아래로 이동 버튼
    chatSearchDown.addEventListener('click', () => {
      if (!searchArray || searchArray.length === 0) {
        showSystemMessage('검색 결과가 없습니다.');
        return;
      }
      searchStatus--;
      if (searchStatus < 0) {
        showSystemMessage('첫 번째 검색 결과입니다.');
        searchStatus = 0;
        return;
      }

      const targetId = searchArray[searchStatus].id;
      highlightMessage(targetId);
    });

    // 채팅방 수정 페이지
    roomEdit.addEventListener('click', () => {
      window.open(`/edit-room/${roomId}`, '_blank');
    });

    // 채팅방 밴 관리 페이지
    roomBanManager.addEventListener('click', () => {
      window.open(`/room/${roomId}/ban-manager`, '_blank');
    });
  } catch (err) {
    container.textContent = `서버 에러가 발생했습니다. ${err}`;
  }
}

// 채팅방 나가기
export function leaveChatRoom() {
  if (socket && currentRoomId) {
    socket.emit('leaveRoom', { roomId: currentRoomId }, (res) => {
      if (res?.success) {
        closeSocketConnection();
      } else {
        console.error('퇴장 처리 실패:', res?.error);
      }
    });
  }
}
