import { escapeHtml, router } from '../app.js';

export function renderRoomsList(container) {
  // 현재 정렬 상태를 추적하기 위한 상태 변수
  let currentSort = 'popular_desc'; // 기본값: 인기 높은순

  container.innerHTML = `
  <div>
    <div class="d-flex justify-content-between align-items-end mb-5 pb-3 border-bottom border-dark border-3">
      <div>
        <h1 class="fw-black m-0 mb-2" style="font-weight: 900; letter-spacing: -2px; font-size: 2.5rem;">실시간 채팅방 목록</h1>
        <div class="fw-bold" style="font-size: 1.2rem;">
          현재 <span id="total-users" style="font-size: 1.5rem;">0</span>명이 접속 중입니다.
        </div>
      </div>
      <button id="create-room-btn" class="btn btn-dark px-4 fw-bold border-2 shadow-none" 
              style="height: 42px; border: 2px solid #000; border-radius: 8px;">
        + 방 만들기
      </button>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-4 gap-2">
      <div class="flex-grow-1">
        <div class="input-group border border-dark border-2" style="border-radius: 8px; overflow: hidden;">
          <span class="input-group-text bg-white border-0">
            <i class="bi bi-search text-dark"></i>
          </span>
          <input type="text" id="room-search" class="form-control border-0 shadow-none" placeholder="방 제목 검색" style="height: 40px;">
          <button class="btn btn-dark fw-bold border-0 px-3" id="search-btn">검색</button>
        </div>
      </div>
      
      <div class="btn-group border border-dark border-2 shadow-sm" style="border-radius: 8px; overflow: hidden;">
        <button id="sort-popular" class="btn btn-dark fw-bold btn-sm px-3 d-flex align-items-center gap-2" style="height: 40px;">
          인기순 <i class="bi bi-arrow-down" id="icon-popular"></i>
        </button>
        <button id="sort-date" class="btn btn-white fw-bold btn-sm px-3 d-flex align-items-center gap-2 border-start border-dark border-2" style="height: 40px;">
          생성일 <i class="bi bi-arrow-down d-none" id="icon-date"></i>
        </button>
      </div>
    </div>

    <div class="table-responsive border border-dark border-2" style="border-radius: 12px; overflow: hidden;">
      <table class="table table-hover mb-0" style="table-layout: fixed; width: 100%;">
        <thead class="table-dark">
          <tr class="text-center align-middle">
            <th class="py-3 ps-4 text-start border-0 fw-bold" style="width: 50%;">방 제목</th>
            <th class="py-3 border-0 fw-bold" style="width: 15%;">방장</th>
            <th class="py-3 border-0 fw-bold" style="width: 10%;">참여 인원</th>
            <th class="py-3 border-0 fw-bold" style="width: 15%;">생성일</th>
            <th class="py-3 border-0 fw-bold" style="width: 10%;">입장 상태</th>
          </tr>
        </thead>
        <tbody id="rooms-tbody"></tbody>
      </table>
    </div>
  </div>
  `;

  const tbody = document.getElementById('rooms-tbody');
  const searchInput = document.getElementById('room-search');
  const searchBtn = document.getElementById('search-btn');
  const createRoomBtn = document.getElementById('create-room-btn');
  const totalUsersElem = document.getElementById('total-users');
  // 정렬 버튼 및 아이콘
  const btnPopular = document.getElementById('sort-popular');
  const btnDate = document.getElementById('sort-date');
  const iconPopular = document.getElementById('icon-popular');
  const iconDate = document.getElementById('icon-date');

  function formatDate(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    
    if (isNaN(date.getTime())) return isoString;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async function renderRooms(search = '') {
    try {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 fw-bold bg-white text-muted">데이터 동기화 중...</td></tr>`;

      // API 호출 시 currentSort 값을 전달
      const [roomsRes, totalUsersRes] = await Promise.all([
        fetch(`/api/rooms?search=${encodeURIComponent(search)}&sort=${currentSort}`, {
          method: 'GET',
          credentials: 'include'
        }),
        fetch(`/api/rooms/total-users`, {
          method: 'GET',
          credentials: 'include'
        })
      ]);

      const rooms = await roomsRes.json();
      const totalUsersData = await totalUsersRes.json();

      if (totalUsersElem) {
        totalUsersElem.innerText = (typeof totalUsersData === 'object' ? totalUsersData.count : totalUsersData) ?? 0;
      }

      tbody.innerHTML = '';
      if (!rooms || rooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 fw-bold bg-white text-muted">검색된 방이 없습니다.</td></tr>`;
        return;
      }

      rooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.className = 'align-middle border-bottom border-dark';
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td class="ps-4 py-3">
            <div class="fw-bold text-dark text-truncate" style="font-size: 1.1rem;">${escapeHtml(room.name)}</div>
          </td>
          <td class="text-center fw-bold text-secondary">${escapeHtml(room.owner.name)}</td>
          <td class="text-center fw-bold">${room.currentMembers} / ${room.maxMembers}</td>
          <td class="text-center fw-bold">${formatDate(room.createdAt)}</td>
          <td class="text-center fw-bold" style="font-size: 0.9rem;">${room.password ? '비공개' : '공개'}</td>
        `;
        tr.addEventListener('click', async () => {
          history.pushState(null, '', `/room/${room.id}`);
          await router();
        });
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('API Error:', err);
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-danger fw-black bg-white">통신 오류 발생</td></tr>`;
    }
  }

  // 정렬 버튼 토글 로직
  function updateUI(activeBtn, inactiveBtn, activeIcon, inactiveIcon, sortType) {
    // 버튼 색상 토글
    activeBtn.classList.replace('btn-white', 'btn-dark');
    inactiveBtn.classList.replace('btn-dark', 'btn-white');
    // 아이콘 노출 토글
    activeIcon.classList.remove('d-none');
    inactiveIcon.classList.add('d-none');
    
    // 화살표 방향 변경 (이미 해당 정렬 방식일 때 누르면 반전)
    if (currentSort.startsWith(sortType)) {
      if (currentSort.endsWith('desc')) {
        currentSort = `${sortType}_asc`;
        activeIcon.classList.replace('bi-arrow-down', 'bi-arrow-up');
      } else {
        currentSort = `${sortType}_desc`;
        activeIcon.classList.replace('bi-arrow-up', 'bi-arrow-down');
      }
    } else {
      // 새로운 정렬 클릭 시 기본은 높은순(desc)
      currentSort = `${sortType}_desc`;
      activeIcon.className = 'bi bi-arrow-down';
    }
    
    renderRooms(searchInput.value);
  }

  btnPopular.addEventListener('click', () => updateUI(btnPopular, btnDate, iconPopular, iconDate, 'popular'));
  btnDate.addEventListener('click', () => updateUI(btnDate, btnPopular, iconDate, iconPopular, 'createdAt'));
  searchBtn.addEventListener('click', () => renderRooms(searchInput.value));
  createRoomBtn.addEventListener('click', async () => {
    history.pushState(null, '', '/create-room');
    await router();
  });

  renderRooms();
}