import { escapeHtml, router } from '../app.js'

export function renderRoomsList(container) {
  container.innerHTML = `
  <div class="d-flex justify-content-between align-items-center mb-4">
    <div>
      <h3 class="fw-bold m-0 text-dark" style="letter-spacing: -1px;">채팅방 목록</h3>
      <div class="d-flex align-items-center mt-1">
        <span class="badge bg-success-subtle text-success border border-success border-opacity-25 rounded-pill px-2 me-2" style="font-size: 0.7rem;">LIVE</span>
        <small class="text-muted">현재 <span class="fw-bold text-dark" id="total-users">0</span>명의 유저가 접속 중입니다.</small>
      </div>
    </div>
    <button id="create-room-btn" class="btn btn-primary px-4 shadow-sm rounded-2 fw-bold" style="background-color: #4361ee; border: none;">
      <i class="bi bi-plus-lg me-2"></i>새 방 만들기
    </button>
  </div>

  <div class="d-flex gap-2 mb-3">
    <div class="input-group shadow-sm rounded-2 flex-grow-1">
      <span class="input-group-text bg-white border-end-0">
        <i class="bi bi-search text-muted fs-6"></i>
      </span>
      <input type="text" id="room-search" class="form-control border-start-0 border-end-0 fs-6" placeholder="방 제목을 입력하세요.">
      <button class="btn btn-dark px-5 fw-bold" id="search-btn">검색</button>
    </div>
    <button class="btn btn-light border shadow-sm px-4 fw-bold rounded-2 text-dark text-nowrap" onclick="location.reload()" title="새로고침" style="min-width: fit-content;">
      <i class="bi bi-arrow-clockwise me-1 text-primary"></i>새로고침
    </button>
  </div>

  <div class="d-flex gap-2 mb-4">
    <button class="btn btn-dark btn-md px-4 py-2 rounded-2 fw-bold d-flex align-items-center" data-sort="popular">
      <i class="bi bi-fire me-2"></i>인기순
    </button>
    <button class="btn btn-outline-dark bg-white text-dark btn-md px-4 py-2 rounded-2 fw-bold d-flex align-items-center" data-sort="recent-chat">
      <i class="bi bi-chat-dots me-2"></i>마지막 대화순
    </button>
    <button class="btn btn-outline-dark bg-white text-dark btn-md px-4 py-2 rounded-2 fw-bold d-flex align-items-center" data-sort="newest">
      <i class="bi bi-clock me-2"></i>날짜순
    </button>
  </div>

  <div class="table-responsive shadow-sm rounded-2 overflow-hidden border">
    <table class="table table-hover align-middle mb-0">
      <thead class="table-dark"> 
        <tr style="font-size: 1.1rem;"> <th class="py-3 ps-4 border-0 fw-bold" style="width: 50%;">방 정보</th>
          <th class="py-3 text-center border-0 fw-bold" style="width: 15%;">방장</th>
          <th class="py-3 text-center border-0 fw-bold" style="width: 15%;">참여 인원</th>
          <th class="py-3 text-center border-0 fw-bold" style="width: 20%;">상태</th>
        </tr>
      </thead>
      <tbody id="rooms-tbody">
      </tbody>
    </table>
  </div>
  `;

  const tbody = document.getElementById('rooms-tbody');
  const searchInput = document.getElementById('room-search');
  const searchBtn = document.getElementById('search-btn');
  const createRoomBtn = document.getElementById('create-room-btn');

  // 필터 버튼 클릭 시 활성화 표시 토글 로직
  container.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('[data-sort]').forEach(b => {
        b.classList.add('bg-white', 'text-dark');
        b.classList.remove('btn-dark', 'text-white');
      });
      e.currentTarget.classList.remove('bg-white', 'text-dark');
      e.currentTarget.classList.add('btn-dark', 'text-white');
      
      renderRooms(searchInput.value, e.currentTarget.dataset.sort);
    });
  });

  async function renderRooms(search='', sort='popular') {
    try {
      const res = await fetch(`/api/rooms?search=${encodeURIComponent(search)}&sort=${sort}`, {
        method: 'GET',
        credentials: 'include'
      });
      const rooms = await res.json();
      tbody.innerHTML = '';

      if (rooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-muted bg-white">현재 개설된 채팅방이 없습니다.</td></tr>`;
        return;
      }

      rooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white border-bottom';
        tr.style.cursor = 'pointer';
        
        tr.innerHTML = `
          <td class="ps-4 py-3">
            <span class="fw-bold text-dark d-block" style="font-size: 1.05rem;">${escapeHtml(room.name)}</span>
          </td>
          <td class="text-center text-muted small">
            <span class="bg-light px-2 py-1 rounded border">${escapeHtml(room.owner.name)}</span>
          </td>
          <td class="text-center">
            <div class="fw-bold ${room.currentMembers >= room.maxMembers ? 'text-danger' : 'text-primary'}">
              ${room.currentMembers} <span class="text-muted fw-normal">/ ${room.maxMembers}</span>
            </div>
          </td>
          <td class="text-center">
            ${room.password 
              ? '<span class="text-warning small fw-bold"><i class="bi bi-lock-fill me-1"></i>비공개</span>' 
              : '<span class="text-success small fw-bold"><i class="bi bi-globe me-1"></i>공개</span>'}
          </td>
        `;
        
        tr.addEventListener('click', async () => {
          history.pushState(null, '', `/room/${room.id}`);
          await router();
        });
        
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-danger bg-white small">서버와의 연결이 원활하지 않습니다.</td></tr>`;
    }
  }

  searchBtn.addEventListener('click', () => renderRooms(searchInput.value));
  createRoomBtn.addEventListener('click', async () => {
    history.pushState(null, '', '/create-room');
    await router();
  });

  renderRooms();
}