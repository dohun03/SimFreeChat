let socket = null;
let currentRoomId = null;

export async function renderChatRoom(container, user, roomId) {
  if (!user) {
    location.hash = '#/login';
    return;
  }

  currentRoomId = roomId;

  try {
    const res = await fetch(`http://localhost:4000/rooms/${roomId}`, {
      method: 'GET',
      credentials: 'include',
    });

    const room = await res.json();
    console.log(room);
    if (!res.ok) {
      container.innerHTML = '<h3>존재하지 않거나 접근할 수 없는 방입니다.</h3>';
      return;
    }

    container.innerHTML = `
    <h3 class="mb-3 text-dark fw-semibold">${room.name}</h3>
    
    <div class="d-flex gap-3 p-3 bg-secondary bg-opacity-10 rounded shadow-sm">
      <!-- 채팅 메시지 영역 -->
      <div id="chat-messages" class="border rounded p-2 flex-grow-1 overflow-auto" style="height: 400px; background-color: #fff;">
      </div>
  
      <!-- 유저 목록 영역 -->
      <div id="chat-users" class="border rounded p-2 bg-gray" style="height: 400px; width: 250px; overflow-y: auto;">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>참여자</strong>
          <span id="user-count" class="badge bg-primary rounded-pill">0 / ${room.maxMembers}</span>
        </div>
        <ul id="users-list" class="list-group"></ul>
      </div>
    </div>
  
    <div id="chat-form" class="mt-3 hstack gap-3">
      <input class="form-control me-auto" type="text" placeholder="메세지를 입력하세요" aria-label="메세지를 입력하세요">
      <button type="button" id="chat-input" class="btn btn-secondary">Submit</button>
      <div class="vr"></div>
      <button type="button" class="btn btn-outline-danger">Reset</button>
    </div>
    `;

    const userList = document.getElementById('users-list');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    socket = io('http://localhost:4000', { 
      withCredentials: true,
      reconnection: true,          // 자동 재연결
      reconnectionAttempts: 10,    // 최대 재시도 횟수
      reconnectionDelay: 2000,     // 재시도 간격
    });
    socket.emit('joinRoom', { roomId });

    socket.on('systemMessage', data => {
      // 입/퇴장 메세지 출력
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.appendChild(document.createTextNode(data.msg));
      p.appendChild(strong);
      chatMessages.appendChild(p);
    
      // 접속 유저 표시
      const roomUsers = data.roomUsers;
      userList.innerHTML = '';
      roomUsers.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        li.classList.add('list-group-item','list-group-item-primary');
        userList.appendChild(li);
      });
    
      // 접속 인원수 표시
      const userCount = document.getElementById('user-count');
      userCount.textContent = `${data.roomUserCount} / ${room.maxMembers}`;
    });
    
    socket.on('chatMessage', data => {
      const p = document.createElement('p');
      p.innerHTML = `<strong>${data.username}:</strong> ${data.msg}`;
      chatMessages.appendChild(p);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    chatForm.addEventListener('submit', e => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;
      socket.emit('sendMessage', { roomId, msg });
      chatInput.value = '';
    });
  } catch (err) {
    container.innerHTML = `<h3>서버 에러가 발생했습니다. ${err}</h3>`;
  }
}

export function leaveChatRoom() {
  if (socket && currentRoomId) {
    socket.emit('leaveRoom', { roomId: currentRoomId });
    socket.disconnect();
    socket = null;
  }
}