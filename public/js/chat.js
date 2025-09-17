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
    if (!res.ok) {
      container.innerHTML = '<h3>존재하지 않거나 접근할 수 없는 방입니다.</h3>';
      return;
    }

    container.innerHTML = `
    <h3 class="mb-3 text-dark fw-semibold">${room.name}</h3>
    
    <div class="d-flex gap-3 p-3 bg-secondary bg-opacity-10 rounded shadow-sm">
      <!-- 채팅 메시지 영역 -->
      <div id="chat-messages" class="border rounded p-2 flex-grow-1 overflow-auto" style="height: 300px; background-color: #fff;">
      </div>
  
      <!-- 유저 목록 영역 -->
      <div id="chat-users" class="border rounded p-2 bg-gray" style="height: 300px; width: 200px; overflow-y: auto;">
        <ul id="users-list" class="list-group"></ul>
      </div>
    </div>
  
    <form id="chat-form" class="mt-3 d-flex">
      <input type="text" id="chat-input" class="form-control me-2" placeholder="메세지 입력..." />
      <button type="submit" class="btn btn-primary">전송</button>
    </form>
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
      console.log(data);
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.appendChild(document.createTextNode(data.msg)); // XSS 안전
      p.appendChild(strong);
      chatMessages.appendChild(p);

      const roomUsers = data.roomUsers;
      userList.innerHTML = '';
      roomUsers.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        li.classList.add('list-group-item','list-group-item-primary');
        userList.appendChild(li);
      });
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