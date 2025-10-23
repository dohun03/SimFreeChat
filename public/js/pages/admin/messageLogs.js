import { router, formatDate } from "../../app.js";

export async function renderAdminMessageLogs(container, user) {
  if (!user || !user.is_admin) {
    container.innerHTML = '<h2 class="text-center mt-5">권한이 없습니다.</h2>';
    return;
  }

  container.innerHTML = `
  <div class="container mt-4">
    <h2 class="mb-3">메시지 로그 관리</h2>
    <!-- 첫 줄: 검색창 + 내용 선택 + 검색 버튼 (input group) -->
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

    <!-- 둘째 줄: 좌측 필터(날짜+액션), 우측 페이징+줄 선택 -->
    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap">
      <!-- 좌측 필터 -->
      <div class="d-flex align-items-center gap-2 mb-1">
        <input type="date" id="start-date" class="form-control form-control-sm" style="width: 130px;">
        <span>~</span>
        <input type="date" id="end-date" class="form-control form-control-sm" style="width: 130px;">
        <select id="action-type" class="form-select form-select-sm" style="width: 120px;">
          <option value="">[액션 타입]</option>
          <option value="SEND">SEND</option>
          <option value="EDIT">EDIT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <!-- 우측 페이징 + 줄 선택 -->
      <div class="d-flex align-items-center gap-2 mb-1">
        <select id="line" class="form-select form-select-sm" style="width: 100px;">
          <option value="10">10줄</option>
          <option value="50">50줄</option>
          <option value="100">100줄</option>
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
    
    <!-- 총 개수 표시줄 -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div>
        <span id="total-count-info" class="fw-bold">총 0건</span>
      </div>
    </div>

    <!-- 메시지 로그 테이블 -->
    <div class="table-responsive" 
        style="max-height: 500px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px;">
      <table class="table table-hover table-bordered align-middle mb-0" style="font-size: 0.8rem;">
        <col style="width: 8%">
        <col style="width: 8%">
        <col style="width: 16%">
        <col style="width: 8%">
        <col style="width: 16%">
        <col>
        <col style="width: 80px">
        <col style="width: 20%">
        <thead class="table-light" style="position: sticky; top: 0; z-index: 2;">
          <tr>
            <th>로그 ID</th>
            <th>방 ID</th>
            <th>방 이름</th>
            <th>유저 ID</th>
            <th>유저 이름</th>
            <th>메시지 내용</th>
            <th>액션</th>
            <th>시각</th>
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  </div>
  `;

  const tableBody = document.getElementById('table-body');
  const searchInput = document.getElementById('search');
  const searchType = document.getElementById('search-type');
  const startDate = document.getElementById('start-date');
  const endDate = document.getElementById('end-date');
  const actionType = document.getElementById('action-type');
  const searchBtn = document.getElementById('search-btn');
  const line = document.getElementById('line');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const currentPageInfo = document.getElementById('current-page-info');
  const totalCountInfo = document.getElementById('total-count-info');

  let currentPage = 1;
  let total;

  function goPage(value) {
    const totalPages = Math.ceil(total / line.value);
    const nextPage = currentPage + value;
  
    if (nextPage < 1 || nextPage > totalPages) {
      alert('이동할 페이지가 없습니다.');
      return;
    }
  
    currentPage = nextPage;
    renderTable();
  }
  
  async function renderTable() {
    try {
      const payload = {
        search: searchInput.value.trim(),
        searchType: searchType.value,
        startDate: startDate.value,
        endDate: endDate.value,
        actionType: actionType.value,
        line: line.value,
        currentPage: currentPage,
      };
  
      const queryString = new URLSearchParams(payload).toString();
      const res = await fetch(`/api/messages/logs?${queryString}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('메시지 로그를 불러오는 중 오류 발생');
  
      const { messageLogs, totalCount } = await res.json();
  
      tableBody.innerHTML = '';
      messageLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.dataset.id = log.id;
        tr.innerHTML = `
          <td>${log.id}</td>
          <td>${log.room_id}</td>
          <td>${log.roomname}</td>
          <td>${log.user_id}</td>
          <td class="text-truncate" style="max-width: 150px;">${log.username}</td>
          <td class="text-truncate" style="max-width: 200px;">${log.message_content}</td>
          <td>${log.action}</td>
          <td>${formatDate(log.created_at)}</td>
        `;
        tableBody.appendChild(tr);
      });

      total = totalCount;
      totalCountInfo.innerHTML = `총 ${totalCount}건`;
  
      const totalPages = Math.ceil(total / line.value);
      currentPageInfo.innerText = `${currentPage} / ${totalPages}`;
    } catch (err) {
      console.error(err);
    }
  }

  searchBtn.addEventListener('click', () => {
    currentPage = 1;
    renderTable();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key==='Enter') {
      currentPage = 1;
      renderTable();
    }
  });

  startDate.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  endDate.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  searchType.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  actionType.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  line.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  prevPageBtn.addEventListener('click', () => goPage(-1));
  nextPageBtn.addEventListener('click', () => goPage(1));

  renderTable();
}
