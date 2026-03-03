import { formatDate } from "../../app.js";

export async function renderAdminMessageLogs(container, user) {
  if (!user?.isAdmin) {
    container.innerHTML = '<h2 class="text-center mt-5">권한이 없습니다.</h2>';
    return;
  }

  container.innerHTML = `
  <div class="container mt-4">
    <h2 class="mb-3">메시지 로그 관리</h2>

    <!-- 검색창 + 검색 타입 + 버튼 -->
    <div class="input-group mb-2" style="max-width: 600px;">
      <input type="text" id="search" class="form-control form-control-sm" placeholder="검색 (유저명, 방 이름, 메시지 내용)" style="flex: 1 1 auto;">
      <select id="search-type" class="form-select form-select-sm" style="flex: 0 0 120px;">
        <option value="">[검색 타입]</option>
        <option value="message">메시지 내용</option>
        <option value="user">유저명</option>
        <option value="room">방 이름</option>
      </select>
      <button class="btn btn-primary btn-sm" id="search-btn">검색</button>
    </div>

    <!-- 필터 + 페이징 + 줄 선택 -->
    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap">
      <div class="d-flex align-items-center gap-2 mb-1">
        <select id="year-date" class="form-select form-select-sm" style="width: 100px;">
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
        <select id="month-date" class="form-select form-select-sm" style="width: 100px;">
          <option value="">월</option>
          ${Array.from({ length: 12 }, (_, i) => `<option value="${String(i+1).padStart(2,'0')}">${i+1}</option>`).join('')}
        </select>
        <select id="message-type" class="form-select form-select-sm" style="width: 130px;">
          <option value="">[메시지 타입]</option>
          <option value="TEXT">TEXT</option>
          <option value="IMAGE">IMAGE</option>
        </select>
        <select id="action-type" class="form-select form-select-sm" style="width: 120px;">
          <option value="">[액션 타입]</option>
          <option value="SEND">SEND</option>
          <option value="EDIT">EDIT</option>
          <option value="DELETE">DELETE</option>
        </select>
        <select id="room-id-type" class="form-select form-select-sm" style="width: 120px;"></select>
        <select id="room-owner-id-type" class="form-select form-select-sm" style="width: 120px;"></select>
        <select id="user-id-type" class="form-select form-select-sm" style="width: 120px;"></select>
      </div>

      <div class="d-flex align-items-center gap-2 mb-1">
        <select id="line" class="form-select form-select-sm" style="width: 100px;">
          <option value="50">50줄</option>
          <option value="100">100줄</option>
          <option value="300">300줄</option>
        </select>

        <nav aria-label="Page navigation">
          <ul class="pagination pagination-sm mb-0 flex-wrap">
            <li class="page-item"><button class="page-link" id="prev-page">«</button></li>
            <li class="page-item"><span class="page-link" id="current-page-info">1</span></li>
            <li class="page-item"><button class="page-link" id="next-page">»</button></li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- 총 개수 표시 -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span id="total-count-info" class="fw-bold">총 0건</span>
    </div>

    <!-- 테이블 -->
    <div class="table-responsive" style="max-height: 500px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px;">
      <table class="table table-hover table-bordered align-middle mb-0" style="font-size: 0.8rem;">
        <col style="width: 5%">
        <col style="width: 5%">
        <col style="width: 5%">
        <col style="width: 14%">
        <col style="width: 5%">
        <col style="width: 5%">
        <col style="width: 14%">
        <col style="width: 7%">
        <col>
        <col style="width: 80px">
        <col style="width: 15%">
        <thead class="table-light" style="position: sticky; top: 0; z-index: 2;">
          <tr>
            <th>No.</th>
            <th>로그 ID</th>
            <th>방 ID</th>
            <th>방 이름</th>
            <th>방장 ID</th>
            <th>유저 ID</th>
            <th>유저 이름</th>
            <th>메시지 타입</th>
            <th>메시지 내용</th>
            <th>액션</th>
            <th>시각</th>
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  </div>

  <!-- 메시지 전체보기 Modal -->
  <div class="modal fade" id="messageModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">메시지 내용</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <pre id="messageModalContent" style="white-space: pre-wrap; font-size:14px;"></pre>
        </div>
      </div>
    </div>
  </div>
  `;

  // DOM Elements
  const tableBody = document.getElementById('table-body');
  const searchInput = document.getElementById('search');
  const searchType = document.getElementById('search-type');
  const searchBtn = document.getElementById('search-btn');
  const yearDate = document.getElementById('year-date');
  const monthDate = document.getElementById('month-date');
  const messageType = document.getElementById('message-type');
  const actionType = document.getElementById('action-type');
  const roomIdType = document.getElementById('room-id-type');
  const roomOwnerIdType = document.getElementById('room-owner-id-type');
  const userIdType = document.getElementById('user-id-type');
  const line = document.getElementById('line');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const currentPageInfo = document.getElementById('current-page-info');
  const totalCountInfo = document.getElementById('total-count-info');

  // 메타 데이터 필터 로드
  async function loadLogMeta() {
    const res = await fetch('/api/messages/log/metadata');
    const data = await res.json();
  
    fillSelect(roomIdType, data.roomIds, '[방 ID]');
    fillSelect(roomOwnerIdType, data.roomOwnerIds, '[방장 ID]');
    fillSelect(userIdType, data.userIds, '[유저 ID]');
  }
  
  function fillSelect(selectEl, list, name) {
    selectEl.innerHTML = '';
  
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = name;
    selectEl.appendChild(defaultOption);
  
    list.sort((a, b) => a - b);
  
    for (const value of list) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    }
  }
  
  loadLogMeta();
  
  // 상태 관리
  const state = {
    currentPage: 1,
    total: 0,
    firstId: null,
    lastId: null,
    year: new Date().getFullYear(),
    month: ''
  };

  // 날짜 필터
  function getDateRange(year, month) {
    if (!year) return { startDate: null, endDate: null };
    if (!month) return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };

    const lastDay = new Date(year, Number(month), 0).getDate();

    return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${lastDay}` };
  }

  // 메시지 로그 쿼리 페이로드
  function getQueryPayload(cursor = null, direction = null) {
    const { startDate, endDate } = getDateRange(state.year, state.month);

    const payload = {
      search: searchInput.value.trim(),
      searchType: searchType.value,
      startDate,
      endDate,
      messageType: messageType.value,
      actionType: actionType.value,
      roomIdType: roomIdType.value,
      roomOwnerIdType: roomOwnerIdType.value,
      userIdType: userIdType.value,
      line: line.value
    };

    if (cursor) payload.cursor = cursor;
    if (direction) payload.direction = direction;

    return payload;
  }

  // 메시지 로그 테이블 렌더링
  async function loadPage({ cursor = null, direction = null } = {}) {
    try {
      const payload = getQueryPayload(cursor, direction);
      const queryString = new URLSearchParams(payload).toString();
      console.log(queryString);
      const res = await fetch(`/api/messages/logs?${queryString}`, { method: 'GET', credentials: 'include' });
      if (!res.ok) throw new Error('메시지 로그를 불러오는 중 오류 발생');

      let { messageLogs, totalCount } = await res.json();
      if (direction === 'prev') messageLogs = messageLogs.reverse();

      state.total = totalCount;
      renderTableRows(messageLogs);
      updatePaginationInfo();
    } catch (err) {
      console.error(err);
    }
  }
  
  function renderTableRows(messageLogs) {
    let count = 0;
    tableBody.innerHTML = '';
    messageLogs.forEach(log => {
      const tr = document.createElement('tr');
      tr.dataset.id = log.id;
      tr.innerHTML = `
        <td>${++count}</td>
        <td>${log.id}</td>
        <td>${log.roomId}</td>
        <td>${log.roomName}</td>
        <td>${log.roomOwnerId}</td>
        <td>${log.userId}</td>
        <td class="text-truncate" style="max-width: 150px;">${log.userName}</td>
        <td class="text-truncate" style="max-width: 200px;">${log.type}</td>
        <td class="text-truncate message-cell" 
            style="max-width: 200px; cursor: pointer;"
            data-full="${log.messageContent?.replace(/"/g, '&quot;')}">
            ${log.messageContent}
        </td>
        <td>${log.action}</td>
        <td>${formatDate(log.createdAt)}</td>
      `;
      tableBody.appendChild(tr);
    });

    if (messageLogs.length > 0) {
      state.firstId = messageLogs[messageLogs.length - 1].id;
      state.lastId = messageLogs[0].id;
    }
  }
  
  // 페이지네이션
  function updatePaginationInfo() {
    totalCountInfo.innerText = `총 ${Number(state.total).toLocaleString()}건`;
    const totalPages = Math.ceil(state.total / line.value);
    currentPageInfo.innerText = `${state.currentPage} / ${totalPages}`;
  }

  function resetAndLoadPage() {
    state.currentPage = 1;
    loadPage();
  }

  function goPage(direction) {
    const totalPages = Math.ceil(state.total / line.value);

    if (direction === 'prev') {
      if (state.currentPage <= 1) return alert('이동할 페이지가 없습니다.');

      state.currentPage -= 1;
      loadPage({ cursor: state.lastId, direction: 'prev' });
    } else if (direction === 'next') {
      if (state.currentPage >= totalPages) return alert('이동할 페이지가 없습니다.');

      state.currentPage += 1;
      loadPage({ cursor: state.firstId, direction: 'next' });
    }
  }

  // 이벤트 핸들러
  searchBtn.addEventListener('click', resetAndLoadPage);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') resetAndLoadPage(); });
  [searchType, messageType, actionType, roomIdType, roomOwnerIdType, userIdType, line].forEach(el => el.addEventListener('change', resetAndLoadPage));
  yearDate.addEventListener('change', (e) => {
    state.year = e.target.value;
    resetAndLoadPage();
  });
  monthDate.addEventListener('change', (e) => {
    state.month = e.target.value;
    resetAndLoadPage();
  });
  prevPageBtn.addEventListener('click', () => goPage('prev'));
  nextPageBtn.addEventListener('click', () => goPage('next'));

  // 메시지 내용 클릭 시 모달
  tableBody.addEventListener('click', (e) => {
    const cell = e.target.closest('.message-cell');
    if (!cell) return;
  
    const fullText = cell.dataset.full || '';
    document.getElementById('messageModalContent').innerText = fullText;
  
    let modalInstance = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
  
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(document.getElementById('messageModal'));
    }
  
    modalInstance.show();
  });  

  loadPage();
}
