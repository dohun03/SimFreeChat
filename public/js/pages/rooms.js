import { escapeHtml, router } from '../app.js'

export function renderRoomsList(container) {
  container.innerHTML = `

  <h2 class="mb-3">채팅방 목록</h2>
  <div class="row mb-3 align-items-center">
    <div class="col-md-8">
      <div class="input-group">
        <input type="text" id="room-search" class="form-control" placeholder="방 제목 검색">
        <button class="btn btn-primary" id="search-btn">검색</button>
      </div>
    </div>
    <div class="col-md-4 text-end">
      <button id="create-room-btn" class="btn btn-success">방 생성</button>
    </div>
  </div>

  <table class="table table-bordered table-hover">
  <col/>
  <col style="width: 150px"/>
  <col style="width: 100px"/>
  <col style="width: 100px"/>
    <thead class="table-dark">
      <tr>
        <th>방 이름</th>
        <th class="text-center">방장</th>
        <th class="text-center">인원</th>
        <th class="text-center">공개 여부</th>
      </tr>
    </thead>
    <tbody id="rooms-tbody">
      <tr><td colspan="4">불러오는 중...</td></tr>
    </tbody>
  </table>
  `;

  const tbody = document.getElementById('rooms-tbody');
  const searchInput = document.getElementById('room-search');
  const searchBtn = document.getElementById('search-btn');
  const createRoomhBtn = document.getElementById('create-room-btn');

  async function renderRooms(search='') {
    try {
      const res = await fetch(`/api/rooms?search=${encodeURIComponent(search)}`, {
        method: 'GET',
        credentials: 'include'
      });
      const rooms = await res.json();
      tbody.innerHTML = '';
      if (rooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">채팅방이 없습니다.</td></tr>`;
        return;
      }

      rooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(room.name)}</td>
          <td class="text-center">${escapeHtml(room.owner.username)}</td>
          <td class="text-center">${room.currentMembers} / ${room.maxMembers}</td>
          <td class="text-center">${room.password ? '🔒 비공개' : '🌐 공개'}</td>
        `;
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', async () => {
          history.pushState(null, '', `/room/${room.id}`);
          await router();
        });
        tbody.appendChild(tr);
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="4">서버 오류</td></tr>`;
    }
  }

  searchBtn.addEventListener('click', () => renderRooms(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      renderRooms(searchInput.value);
    }
  });

  createRoomhBtn.addEventListener('click', async () => {
    history.pushState(null, '', '/create-room');
    await router();
  })

  renderRooms();
}
