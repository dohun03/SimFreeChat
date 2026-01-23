import { escapeHtml, formatDate, router } from '../app.js'

let socket = null;
let currentRoomId = null;
let serverLastMessageId;
let loading = false;

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

  const bannedUntil = new Date(user.bannedUntil);
  const now = new Date();
  if (bannedUntil && bannedUntil > now) {
    alert(`이용이 정지된 계정입니다. 사유: ${user.banReason}`);
    history.pushState(null, '', '/');
    await router();
    return;
  }

  roomId = Number(roomId);
  currentRoomId = roomId;

  socket = io({
    transports: ['websocket'],
    withCredentials: true,
  });

  try {
    // 방 및 유저 정보 조회
    const roomRes = await fetch(`/api/rooms/${roomId}`, { method: 'GET', credentials: 'include' });
    if (!roomRes.ok) { container.textContent = '방 정보를 가져올 수 없습니다.'; return; }
    const room = await roomRes.json();
    const isOwner = room.owner.id === user.id;
    
    const bannedUsersRes = await fetch(`/api/room-users/${roomId}`, { method: 'GET', credentials: 'include' });
    const bannedUsers = bannedUsersRes.ok ? await bannedUsersRes.json() : [];
    const banInfo = bannedUsers.find(b => b.user.id === user.id);

    if (banInfo) {
      showErrorMessage(`이 방에서 밴 처리된 사용자입니다: ${banInfo.banReason}`);
      closeSocketConnection();
      return;
    }

    if (room.currentMembers >= room.maxMembers) {
      showErrorMessage('방의 인원이 가득 찼습니다.');
      closeSocketConnection();
      return;
    }

    container.innerHTML = `
      <div class="d-flex flex-column" style="height: calc(100vh - 140px);">
        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-dark border-3 flex-shrink-0">
          <div class="flex-grow-1 min-width-0 pe-3" style="min-width: 0;">
            <h2 id="room-name" class="fw-bolder m-0 text-truncate" 
                style="letter-spacing: -1.5px; font-size: 1.8rem;" 
                title="${escapeHtml(room.name)}">
              # ${escapeHtml(room.name)}
            </h2>
            <div class="small fw-bold text-secondary text-nowrap">
              생성일: ${formatDate(room.createdAt)} | 
              인원: <span id="user-count" class="text-dark"><span id="current-count">0</span> / <span id="max-count">${room.maxMembers}</span></span>
            </div>
          </div>

          <div class="d-flex gap-2 flex-shrink-0">
            <button id="chat-summary-btn" class="btn btn-outline-primary fw-bold btn-sm rounded-3">
              <i class="bi bi-robot"></i> AI 요약
            </button>
            <button id="room-edit" class="btn btn-outline-dark fw-bold btn-sm rounded-3 ${isOwner ? '' : 'd-none'}">
              <i class="bi bi-gear-fill"></i> 설정
            </button>
            <button id="room-ban-manager" class="btn btn-outline-danger fw-bold btn-sm rounded-3 ${isOwner ? '' : 'd-none'}">
              <i class="bi bi-person-x-fill"></i> 밴 관리
            </button>
            <button id="leave-room-btn" class="btn btn-dark fw-bold btn-sm px-3 rounded-3 text-white text-nowrap">나가기</button>
          </div>
        </div>

        <div class="d-flex flex-grow-1 overflow-hidden gap-3 mb-3">
          <div class="position-relative d-flex flex-column border border-dark border-3 bg-light rounded-4 overflow-hidden" 
              style="flex: 0 0 75%; min-width: 0;">
            <div id="system-alerts" class="position-absolute top-0 start-0 w-100 px-3 mt-2" style="z-index: 1050;"></div>
            
            <div id="chat-messages" class="flex-grow-1 overflow-y-auto p-3">
              <ul id="messages-list" class="list-unstyled m-0"></ul>
            </div>

            <div id="new-message-alert" class="position-absolute start-50 translate-middle-x d-none" style="bottom: 20px; z-index:1000;">
              <div class="bg-primary text-white px-3 py-2 rounded-pill shadow-lg small fw-bold" style="cursor:pointer;">
                <i class="bi bi-arrow-down-circle-fill me-1"></i> 새 메시지 보기
              </div>
            </div>
          </div>

          <div class="d-flex flex-column border border-dark border-3 bg-white p-3 rounded-4" style="flex: 0 0 calc(25% - 1rem); min-width: 180px;">
            <div class="mb-3 flex-shrink-0">
              <div class="fw-bold small mb-2 text-uppercase opacity-75">메시지 검색</div>
              <div class="input-group border border-dark border-2 rounded-3 overflow-hidden bg-white">
                <div class="d-flex flex-column border-end border-dark">
                  <button id="search-up" class="btn btn-link btn-sm p-0 px-1 text-dark border-bottom rounded-0 shadow-none"><i class="bi bi-chevron-up"></i></button>
                  <button id="search-down" class="btn btn-link btn-sm p-0 px-1 text-dark rounded-0 shadow-none"><i class="bi bi-chevron-down"></i></button>
                </div>
                <input type="text" id="chat-search" class="form-control border-0 small shadow-none" placeholder="검색...">
                <button id="chat-search-submit" class="btn btn-white border-0"><i class="bi bi-search"></i></button>
              </div>
            </div>

            <div class="flex-grow-1 overflow-y-auto">
              <label class="fw-bold small mb-2 text-uppercase opacity-75">참여자</label>
              <ul id="users-list" class="list-unstyled m-0"></ul>
            </div>
          </div>
        </div>

        <div class="input-group border border-dark border-3 flex-shrink-0 rounded-4 overflow-hidden shadow-sm bg-white">
          <button id="chat-upload-btn" class="btn btn-white border-0 px-3 border-end rounded-0"><i class="bi bi-card-image fs-5 text-dark"></i></button>
          <input type="file" id="chat-upload-input" accept="image/*" style="display:none">
          <textarea id="chat-input" class="form-control border-0 shadow-none p-3" placeholder="메시지를 입력하세요..." rows="1" style="resize: none; height: 58px; background-color: transparent; font-weight: 400;"></textarea>
          <button id="chat-submit" class="btn btn-white border-0 px-4 border-start rounded-0 fw-bold"><i class="bi bi-send-fill fs-5"></i></button>
          <button id="chat-reset" class="btn btn-white border-0 px-3 border-start rounded-0 text-danger"><i class="bi bi-x-circle-fill fs-5"></i></button>
        </div>
      </div>



      <!-- 유저 정보 모달 -->
      <div class="modal fade" id="userInfoModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-dark border-3 rounded-4 shadow-lg">
            <div class="modal-header border-0 pb-0">
              <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center pt-0">
              <div class="mb-3">
                <div class="display-6 text-dark"><i class="bi bi-person-circle"></i></div>
              </div>
              <h4 id="modal-name" class="fw-black mb-1">사용자명</h4>
              <p id="modal-email" class="text-muted small mb-3">user@example.com</p>
              
              <div class="bg-light rounded-3 p-3 mb-3 text-start">
                <div class="small text-muted fw-bold mb-1">가입일</div>
                <div id="modal-created" class="small fw-bold text-dark">2024-00-00</div>
              </div>

              <div id="modal-admin-actions" class="d-none border-top pt-3 mt-2">
                <div class="row g-2">
                  <div class="col-6">
                    <button id="modal-kick-btn" class="btn btn-outline-dark fw-bold w-100 btn-sm rounded-3">강퇴</button>
                  </div>
                  <div class="col-6">
                    <button id="modal-ban-btn" class="btn btn-danger fw-bold w-100 btn-sm rounded-3">밴 처리</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- AI 요약 모달 -->
      <div class="modal fade" id="summaryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-primary border-3 rounded-4 shadow-lg">
            <div class="modal-header bg-light border-0 py-3">
              <h5 class="modal-title fw-black text-primary">
                <i class="bi bi-robot me-2"></i>AI 대화 요약 분석
              </h5>
              <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
              <div id="summary-content" class="lh-lg text-dark fw-medium p-3 bg-light rounded-4 border border-2 border-dark" 
                  style="white-space: pre-wrap; font-size: 1.05rem; min-height: 200px;">
                </div>
            </div>
            <div class="modal-footer border-0">
              <button type="button" class="btn btn-dark fw-bold px-4 rounded-3" data-bs-dismiss="modal">확인</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 이미지 로드 모달 -->
      <div class="modal fade" id="imageModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content border-0" style="background-color: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);">
            <div class="modal-body p-0 d-flex align-items-center justify-content-center" style="min-height: 500px; position: relative;">
              
              <button type="button" 
                      class="btn-close btn-close-white position-absolute top-0 end-0 m-4" 
                      data-bs-dismiss="modal" 
                      style="z-index: 1060; width: 2em; height: 2em;"></button>
              
              <img src="" id="modalImage" 
                  class="img-fluid rounded shadow-2xl" 
                  style="max-height: 90vh; object-fit: contain; border: 1px solid rgba(255,255,255,0.1);">
                  
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
    const newMessageAlert = document.getElementById('new-message-alert');
    const chatInput = document.getElementById('chat-input');
    const chatSubmit = document.getElementById('chat-submit');
    const chatReset = document.getElementById('chat-reset');
    const chatSearchInput = document.getElementById('chat-search');
    const chatSearchSubmit = document.getElementById('chat-search-submit');
    const chatSearchUp = document.getElementById('search-up');
    const chatSearchDown = document.getElementById('search-down');
    const chatSummaryBtn = document.getElementById('chat-summary-btn');
    const roomEdit = document.getElementById('room-edit');
    const roomBanManager = document.getElementById('room-ban-manager');
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    const chatUploadBtn = document.getElementById('chat-upload-btn');
    const chatUploadInput = document.getElementById('chat-upload-input');

    // [ 기능 로직 함수들 ]
    function showSystemMessage(message) {
      const systemContainer = document.getElementById('system-alerts');
      if (!systemContainer) return;

      const alert = document.createElement('div');

      alert.className = `alert bg-dark text-white border border-2 border-light py-3 px-4 fade show shadow-lg mb-3 fw-bolder text-center`;
      alert.innerHTML = `<span style="font-size: 1.05rem; letter-spacing: -0.5px;">${escapeHtml(message)}</span>`;
      
      systemContainer.prepend(alert);
      
      setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
      }, 3000);
    }

    function showErrorMessage(message) {
      container.innerHTML = `<div class="alert alert-danger mt-4 fw-bold">${escapeHtml(message)}</div>`;
    }

    function createMessageElement(msg, currentUserId) {
      const date = formatDate(msg.createdAt);
      const isMine = msg.user.id === currentUserId;
      
      const li = document.createElement('li');
      li.className = `chat-message mb-3 d-flex flex-column w-100 ${isMine ? 'align-items-end' : 'align-items-start'}`;
      li.dataset.id = msg.id;

      let contentHtml = "";
      let bubbleClass = isMine ? 'bg-dark text-white' : 'bg-white text-dark';
      
      if (msg.isDeleted) {
        contentHtml = `<span class="fw-bold small fst-italic text-secondary">삭제된 메시지입니다.</span>`;
        bubbleClass = 'bg-light text-muted border-secondary opacity-75';
      } else {
        if (msg.type === 'image') {
          const thumbName = msg.content.replace(/\.[^/.]+$/, ".webp");
          contentHtml = `<img src="/uploads/images/thumb-${thumbName}" 
                              class="img-fluid rounded-3 border border-dark chat-img-clickable" 
                              style="max-height:450px; cursor:zoom-in;"
                              data-origin="${msg.content}"
                              onerror="this.src='/uploads/images/${msg.content}'">`;
        } else {
          contentHtml = escapeHtml(msg.content);
        }
      }

      li.innerHTML = `
        <div class="fw-black mb-1 px-2 text-dark opacity-75 user-info-trigger" style="cursor: pointer;" data-id="${msg.user.id}">
          ${escapeHtml(msg.user.name)}
        </div>

        <div class="d-flex align-items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}" style="max-width: 90%;">
          <div class="bubble-content py-2 px-3 shadow-sm border border-2 border-dark ${bubbleClass} ${isMine ? 'rounded-start-4 rounded-bottom-4' : 'rounded-end-4 rounded-bottom-4'}" 
               style="word-break: break-all; font-weight: 500; min-height: 38px; white-space: pre-wrap;">${contentHtml}</div>

          <div class="d-flex flex-column ${isMine ? 'align-items-end' : 'align-items-start'}" style="min-width: fit-content;">
            ${isMine && !msg.isDeleted ? 
              `<button class="btn btn-link btn-sm p-0 border-0 text-danger text-decoration-none delete-btn fw-bold mb-1" style="font-size: 10px;">삭제</button>` : ''}
            <div class="text-nowrap fw-bold text-muted" style="font-size: 10px; letter-spacing: -0.5px;">
              ${date}
            </div>
          </div>
        </div>
      `;
      return li;
    }

    // # 메시지 개수 제한
    function keepMessageLimit(direction = 'recent') {
      const limit = 200;
      const currentLength = messagesList.children.length;
      if (currentLength > limit) {
        const removeCount = currentLength - limit;
        for (let i = 0; i < removeCount; i++) {
          if (direction === 'before') {
            messagesList.removeChild(messagesList.lastElementChild);
          } else {
            messagesList.removeChild(messagesList.firstElementChild);
          }
        }
      }
    }

    function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }

    function scrollWhenReady() {
      const images = messagesList.querySelectorAll('img');
      let loadedCount = 0;
      if (images.length === 0) return scrollToBottom();
      images.forEach(img => {
        if (img.complete) { loadedCount++; if (loadedCount === images.length) scrollToBottom(); }
        else { img.addEventListener('load', () => { loadedCount++; if (loadedCount === images.length) scrollToBottom(); }); }
      });
    }

    // # 메시지 로드 (API 요청)
    async function loadMessages(direction = 'init') {
      if (loading) return;
      loading = true;

      const firstMessage = messagesList.firstElementChild;

      let url = `/api/messages/${roomId}`;
      const firstId = messagesList.firstElementChild?.dataset.id;
      const lastId = messagesList.lastElementChild?.dataset.id;

      if (direction === 'before' && firstId) {
        url += `?direction=before&cursor=${firstId}`;
      } else if (direction === 'recent' && lastId) {
        url += `?direction=recent&cursor=${lastId}`;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const messages = await res.json();

        if (!messages || messages.length === 0) {
          console.log('메시지가 더 이상 없습니다.');
          return; 
        }

        const fragment = document.createDocumentFragment();
        [...messages].reverse().forEach(msg => {
          fragment.appendChild(createMessageElement(msg, user.id));
        });

        if (direction === 'before') {
          const beforeTop = firstMessage?.getBoundingClientRect().top;

          messagesList.prepend(fragment);
          keepMessageLimit('before');

          const afterTop = firstMessage.getBoundingClientRect().top;
          const diff = afterTop - beforeTop;
          chatMessages.scrollTop += diff;
        }
        else if (direction === 'recent') {
          messagesList.appendChild(fragment);
          keepMessageLimit('recent');
        }
        else {
          messagesList.innerHTML = '';
          messagesList.appendChild(fragment);
          scrollWhenReady();
        }

      } catch (err) {
        console.error('메시지 로딩 실패:', err);
        showSystemMessage('메시지 로딩 실패');
      } finally {
        loading = false;
      }
    }
    loadMessages('init');

    // [ 소켓 이벤트 바인딩 ]
    socket.emit('joinRoom', { roomId, password: room.password && !isOwner ? prompt('비밀번호를 입력하세요') : undefined });

    socket.on('roomEvent', data => {
      showSystemMessage(data.msg);
      
      userList.innerHTML = '';
      data.roomUsers.forEach(u => {
        const li = document.createElement('li');
        li.className = 'd-flex align-items-center mb-2 p-2 rounded-3 bg-white border border-dark border-1 shadow-sm';
        li.innerHTML = `
          <span class="text-success small me-2">●</span>
          <span class="fw-bold small text-dark text-truncate flex-grow-1">${escapeHtml(u.name)}</span>
          ${room.owner.id === u.id ? '<span class="badge bg-danger p-1 me-1" style="font-size:8px;">OWNER</span>' : ''}
          <div class="dropdown">
            <button class="btn p-0 border-0" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-2">
              <li><button class="dropdown-item fw-bold user-info-btn" data-id="${u.id}">정보</button></li>
              ${isOwner && room.owner.id !== u.id ? `
                <li><button class="dropdown-item text-danger kick-user-btn" data-id="${u.id}">강퇴</button></li>
                <li><button class="dropdown-item text-danger ban-user-btn" data-id="${u.id}">밴</button></li>` : ''}
            </ul>
          </div>`;
        userList.appendChild(li);
      });
      currentCount.textContent = data.roomUserCount;
    });

    socket.on('roomUpdated', data => {
      showSystemMessage(data.msg);
      roomName.textContent = data.room.name;
      maxCount.textContent = data.room.maxMembers;
    });

    socket.on('exception', (data) => {
      alert(`서버 알림: ${data.message}`);
    });

    socket.on('forcedDisconnect', (data) => {
      showErrorMessage(`연결 끊김: ${data.msg}`);
      closeSocketConnection();
    });

    socket.on('messageCreate', data => {
      const { message, lastMessageId } = data;
      const myLastMessageId = messagesList.lastElementChild?.dataset.id || "0";

      const hasScroll = chatMessages.scrollHeight > chatMessages.clientHeight;
      const isMine = message.user.id === user.id;
      const isBottom = isAtBottom(100);

      if (!hasScroll || isMine || (isBottom && myLastMessageId == lastMessageId)) {
        
        messagesList.appendChild(createMessageElement(message, user.id));
        
        keepMessageLimit('recent'); 

        if (message.type === 'image') {
          scrollWhenReady();
        } else {
          scrollToBottom();
        }
      } else {
        if (typeof newMessageAlert === 'function') {
          newMessageAlert(); 
        } else {
          const alertElem = document.getElementById('new-message-alert');
          if (alertElem) alertElem.classList.remove('d-none');
        }
      }

      serverLastMessageId = lastMessageId;
    });

    socket.on('messageDeleted', id => {
      const messageItem = document.querySelector(`li[data-id="${id}"]`);
      if (messageItem) {
        const bubble = messageItem.querySelector('.bubble-content');
        const deleteBtn = messageItem.querySelector('.delete-btn');
        
        bubble.classList.remove('bg-dark', 'text-white', 'bg-white', 'text-dark');
        bubble.classList.add('bg-light', 'text-muted', 'border-secondary', 'opacity-75');
        
        bubble.innerHTML = `<span class="fw-bold fst-italic text-secondary">삭제된 메시지입니다.</span>`;
        
        if (deleteBtn) deleteBtn.remove();
      }
    });

    // [ 이벤트 리스너 ]

    // # 메시지 전송
    chatSubmit.addEventListener('click', () => {
      if (!chatInput.value.trim()) return;
      socket.emit('sendMessage', { roomId, content: chatInput.value, type: 'text' });
      chatInput.value = '';
      chatInput.style.height = '58px';
    });
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSubmit.click(); } });

    // # 메시지 삭제
    messagesList.addEventListener('click', e => {
      const btn = e.target.closest('.delete-btn');
      if (btn && confirm('삭제하시겠습니까?')) {
        const id = btn.closest('.chat-message').dataset.id;
        socket.emit('deleteMessage', { roomId, messageId: id });
      }
    });

    // # 스크롤 감지
    function isAtTop(scrollGap = 50) {
      return chatMessages.scrollTop <= scrollGap;
    }

    function isAtBottom(scrollGap = 50) {
      return chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - scrollGap;
    }

    let topLock = false;
    let bottomLock = false;

    chatMessages.addEventListener('scroll', () => {
      // TOP
      if (!topLock && chatMessages.scrollTop <= 5) {
        topLock = true;

        loadMessages('before').finally(() => {
          setTimeout(() => {
            topLock = false;
          }, 100);
        });
        return;
      }

      // BOTTOM
      if (
        !bottomLock &&
        chatMessages.scrollTop + chatMessages.clientHeight >=
          chatMessages.scrollHeight - 5
      ) {
        bottomLock = true;

        loadMessages('recent').finally(() => {
          setTimeout(() => {
            bottomLock = false;
          }, 100);
        });
      }
    });

    function showNewMessageAlert() {
      newMessageAlert.classList.remove('d-none');
    }

    function hideNewMessageAlert() {
      newMessageAlert.classList.add('d-none');
    }

    newMessageAlert.addEventListener('click', async () => {
      messagesList.innerHTML = '';
      await loadMessages('init');
      
      scrollToBottom();
      hideNewMessageAlert();
    });

    // # 이미지 전송
    chatUploadBtn.addEventListener('click', () => chatUploadInput.click());
    chatUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // webp 썸네일 생성
      const thumbnailBlob = await createThumbnail(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('thumbnail', thumbnailBlob);

      try {
        const res = await fetch('/api/uploads', { method: 'POST', body: formData, credentials: 'include' });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || '업로드 실패');
        }

        const data = await res.json();

        socket.emit('sendMessage', { roomId, content: data.filename, type: 'image' });
      } catch (err) {
        console.error(err);
        alert('이미지 업로드에 실패했습니다.');
      } finally {
        e.target.value = '';
      }
    });

    // Canvas 리사이징 함수
    async function createThumbnail(file, maxUnit = 200) { // 긴 쪽을 200px로!
      return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 비율 계산: 가로/세로 중 더 긴 쪽을 maxUnit(200)에 맞춤
          if (width > height) {
            if (width > maxUnit) {
              height *= maxUnit / width;
              width = maxUnit;
            }
          } else {
            if (height > maxUnit) {
              width *= maxUnit / height;
              height = maxUnit;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(img.src);
            resolve(blob);
          }, 'image/webp', 0.5);
        };
      });
    }

    // 이미지 모달 로드 이벤트
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');

    document.getElementById('chat-messages').addEventListener('click', (e) => {
      // 클릭한 요소가 chat-img-clickable 클래스를 가지고 있는지 확인
      if (e.target.classList.contains('chat-img-clickable')) {
        const originName = e.target.dataset.origin; // 심어둔 원본 파일명 가져오기
        modalImage.src = `/uploads/images/${originName}`; // 원본 이미지 경로 설정
        imageModal.show();
      }
    });

    // # 강퇴/밴/정보 로직
    userList.addEventListener('click', async (e) => {
      const targetId = Number(e.target.dataset.id);
      if (!targetId) return;

      // 1. 강퇴 처리
      if (e.target.classList.contains('kick-user-btn')) {
        if (confirm('정말 이 사용자를 강퇴하시겠습니까?')) {
          socket.emit('kickUser', { roomId, userId: targetId });
        }
      } 
      // 2. 밴 처리
      else if (e.target.classList.contains('ban-user-btn')) {
        const banReason = prompt('밴 사유를 입력하세요:');
        if (banReason !== null) {
          socket.emit('banUser', { roomId, userId: targetId, banReason });
        }
      }
    });

    // 유저 정보 모달 연동
    const userModal = new bootstrap.Modal(document.getElementById('userInfoModal'));

    async function openUserInfoModal(targetUserId) {
      try {
        const res = await fetch(`/api/users/${targetUserId}`);
        if (!res.ok) return;
        const targetUser = await res.json();

        // 데이터 채우기
        document.getElementById('modal-name').textContent = targetUser.name;
        document.getElementById('modal-email').textContent = targetUser.email;
        document.getElementById('modal-created').textContent = formatDate(targetUser.createdAt);

        // 방장 권한 체크
        const adminActions = document.getElementById('modal-admin-actions');
        if (isOwner && targetUser.id !== user.id) {
          adminActions.classList.remove('d-none');

          document.getElementById('modal-kick-btn').onclick = () => {
            if (confirm(`${targetUser.name}님을 강퇴하시겠습니까?`)) {
              socket.emit('kickUser', { roomId, userId: targetUser.id });
              userModal.hide();
            }
          };
          
          document.getElementById('modal-ban-btn').onclick = () => {
            const reason = prompt('밴 사유를 입력하세요:');
            if (reason) {
              socket.emit('banUser', { roomId, userId: targetUser.id, banReason: reason });
              userModal.hide();
            }
          };
        } else {
          adminActions.classList.add('d-none');
        }

        userModal.show();
      } catch (err) {
        console.error('유저 정보 로드 실패', err);
      }
    }

    // 1. 메시지 목록의 닉네임 클릭 시
    messagesList.addEventListener('click', e => {
      const trigger = e.target.closest('.user-info-trigger');
      if (trigger) openUserInfoModal(trigger.dataset.id);
    });

    // 2. 우측 참여자 목록의 '정보' 버튼 클릭 시
    userList.addEventListener('click', e => {
      const infoBtn = e.target.closest('.user-info-btn');
      if (infoBtn) openUserInfoModal(infoBtn.dataset.id);
    });

    // # 검색 기능
    let searchArray = [];
    let searchIdx = 0;
    chatSearchSubmit.addEventListener('click', async () => {
      const val = chatSearchInput.value.trim();
      if (!val) return;
      const res = await fetch(`/api/messages/${roomId}?search=${encodeURIComponent(val)}`);
      searchArray = await res.json();
      if (searchArray.length > 0) { searchIdx = 0; highlight(searchArray[0].id); }
      else showSystemMessage('결과 없음');
    });

    function highlight(id) {
      const target = document.querySelector(`[data-id="${id}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const bubble = target.querySelector('.msg-bubble');
        bubble.classList.add('border-warning', 'border-4');
        setTimeout(() => bubble.classList.remove('border-warning', 'border-4'), 2000);
      }
    }

    chatSearchUp.addEventListener('click', () => { if (searchArray[++searchIdx]) highlight(searchArray[searchIdx].id); else searchIdx--; });
    chatSearchDown.addEventListener('click', () => { if (searchArray[--searchIdx]) highlight(searchArray[searchIdx].id); else searchIdx = 0; });

    // # AI 요약 기능
    const summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));
    const summaryContent = document.getElementById('summary-content');

    chatSummaryBtn.addEventListener('click', async () => {
      const originalContent = chatSummaryBtn.innerHTML;
      chatSummaryBtn.disabled = true;
      chatSummaryBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> 분석중`;

      try {
        const res = await fetch(`/api/messages/${roomId}/summary`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!res.ok) throw new Error('요약 실패');
        const data = await res.json();

        // 1. 모달 텍스트 영역에 요약 결과 삽입
        summaryContent.textContent = data.summary;
        
        // 2. 모달 띄우기
        summaryModal.show();

      } catch (err) {
        console.error('AI 요약 에러:', err);
        showSystemMessage('AI 요약 중 오류가 발생했습니다.');
      } finally {
        chatSummaryBtn.disabled = false;
        chatSummaryBtn.innerHTML = originalContent;
      }
    });

    // # 기타 버튼 이벤트
    leaveRoomBtn.addEventListener('click', () => { window.location.href = '/'; } );
    roomEdit.addEventListener('click', () => window.open(`/edit-room/${roomId}`, '_blank'));
    roomBanManager.addEventListener('click', () => window.open(`/room/${roomId}/ban-manager`, '_blank'));
    chatReset.addEventListener('click', () => { chatInput.value = ''; chatInput.style.height = '58px'; });

  } catch (err) {
    showErrorMessage('서버 에러 발생');
  }
}

export function leaveChatRoom() {
  if (socket && currentRoomId) {
    socket.emit('leaveRoom', { roomId: currentRoomId }, (res) => {
      if (res?.success) closeSocketConnection();
    });
  }
}