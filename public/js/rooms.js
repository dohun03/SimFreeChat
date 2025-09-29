import { escapeHtml } from './app.js'

export function renderRoomsList(container) {
  container.innerHTML = `
    <div class="mb-3">
      <input type="text" id="search" placeholder="방 제목 검색" class="form-control d-inline-block w-75"/>
      <button id="search-btn" class="btn btn-success">검색</button>
      <button id="create-room-btn" class="btn btn-primary float-end">방 생성</button>
    </div>
    <table class="table table-bordered table-hover">
    <col style="width: 70%"/>
    <col style="width: 10%"/>
    <col style="width: 10%"/>
    <col style="width: 10%"/>
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
  const searchInput = document.getElementById('search');
  const searchBtn = document.getElementById('search-btn');
  const createRoomhBtn = document.getElementById('create-room-btn');

  async function loadRooms(search='') {
    try {
      const res = await fetch(`http://localhost:4000/rooms?search=${encodeURIComponent(search)}`, {
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
          <td class="text-center">${room.isPrivate ? '🔒 비공개' : '🌐 공개'}</td>
        `;
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => location.hash = `#/room/${room.id}`);
        tbody.appendChild(tr);
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="4">서버 오류</td></tr>`;
    }
  }

  searchBtn.addEventListener('click', () => loadRooms(searchInput.value));

  createRoomhBtn.addEventListener('click', () => {
    location.href = ''
  })

  loadRooms();
}
