import { router, formatDate } from "../../app.js";

export async function renderAdminUsers(container, user) {
  if (!user || !user.isAdmin) {
    container.innerHTML = '<h2 class="text-center mt-5">권한이 없습니다.</h2>';
    return;
  }

  // 상태 관리 (Offset 기반으로 변경)
  const state = {
    currentPage: 1,
    total: 0,
    limit: 50
  };

  container.innerHTML = `
    <div class="container mt-4">
      <h2 class="mb-3 fw-bold">유저 관리</h2>

      <div class="d-flex justify-content-between align-items-end mb-3 flex-wrap gap-2">
        <div class="d-flex flex-column gap-2">
          <div class="input-group input-group-sm" style="max-width: 400px;">
            <input type="text" id="user-search" class="form-control" placeholder="이름 또는 이메일 검색">
            <button class="btn btn-primary" id="search-btn">검색</button>
          </div>
          <div class="d-flex gap-2">
            <select id="admin-filter" class="form-select form-select-sm" style="width: 130px;">
              <option value="">[권한 필터]</option>
              <option value="true">관리자</option>
              <option value="false">일반 사용자</option>
            </select>
            <select id="ban-filter" class="form-select form-select-sm" style="width: 130px;">
              <option value="">[밴 여부]</option>
              <option value="true">밴 처리됨</option>
              <option value="false">정상</option>
            </select>
          </div>
        </div>

        <div class="d-flex flex-column align-items-end gap-2">
          <div class="d-flex align-items-center gap-2">
            <select id="line-limit" class="form-select form-select-sm" style="width: 100px;">
              <option value="50">50줄</option>
              <option value="100">100줄</option>
              <option value="300">300줄</option>
            </select>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item"><button class="page-link" id="prev-page">«</button></li>
                <li class="page-item"><span class="page-link px-3" id="current-page-info">1</span></li>
                <li class="page-item"><button class="page-link" id="next-page">»</button></li>
              </ul>
            </nav>
          </div>
          <span id="total-user-count" class="fw-bold text-primary">총 유저: 0명</span>
        </div>
      </div>

      <div class="table-responsive" style="max-height: 600px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <table class="table table-hover table-bordered align-middle mb-0">
          <thead class="table-light" style="position: sticky; top: 0; z-index: 2;">
            <tr>
              <th style="width: 8%">ID</th>
              <th>이름</th>
              <th style="width: 25%">이메일</th>
              <th style="width: 25%">가입일</th>
              <th style="width: 8%">권한</th>
              <th style="width: 8%">상태</th>
            </tr>
          </thead>
          <tbody id="user-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  const userTableBody = document.getElementById('user-table-body');
  const searchInput = document.getElementById('user-search');
  const searchBtn = document.getElementById('search-btn');
  const adminFilter = document.getElementById('admin-filter');
  const banFilter = document.getElementById('ban-filter');
  const lineLimit = document.getElementById('line-limit');
  const totalUserCount = document.getElementById('total-user-count');
  const currentPageInfo = document.getElementById('current-page-info');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');

  async function loadUsers() {
    try {
      const offset = (state.currentPage - 1) * state.limit;

      // 1. 보낼 데이터 객체 생성
      const queryObj = {
        search: searchInput.value.trim(),
        isAdmin: adminFilter.value,
        isBanned: banFilter.value,
        limit: state.limit,
        offset: offset
      };

      const params = new URLSearchParams();
      Object.entries(queryObj).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const res = await fetch(`/api/users?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('유저 데이터를 불러오는 중 오류 발생');
      
      const { users, totalCount } = await res.json();
      
      state.total = totalCount;
      renderTable(users);
      updateUI();
    } catch (err) {
      console.error(err);
      userTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">데이터 로드 실패</td></tr>';
    }
  }

  function renderTable(users) {
    userTableBody.innerHTML = '';
    if (!users || users.length === 0) {
      userTableBody.innerHTML = '<tr><td colspan="6" class="py-4 text-muted">유저가 없습니다.</td></tr>';
      return;
    }

    users.forEach((u) => {
      const tr = document.createElement('tr');
      tr.dataset.id = u.id;
      tr.style.cursor = 'pointer';
      
      const isCurrentlyBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
      const statusBadge = isCurrentlyBanned 
        ? '<strong class="text-danger">Banned</strong>' 
        : '<strong class="text-primary">Active</strong>';

      tr.innerHTML = `
        <td>${u.id}</td>
        <td class="fw-bold">${u.name}</td>
        <td>${u.email}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>${u.isAdmin ? '<span class="text-primary fw-bold">관리자</span>' : '사용자'}</td>
        <td>${statusBadge}</td>
      `;
      userTableBody.appendChild(tr);
    });
  }

  function updateUI() {
    totalUserCount.textContent = `총 유저: ${state.total.toLocaleString()}명`;
    const totalPages = Math.ceil(state.total / state.limit) || 1;
    currentPageInfo.textContent = `${state.currentPage} / ${totalPages}`;
  }

  function goPage(direction) {
    const totalPages = Math.ceil(state.total / state.limit);
    if (direction === 'prev' && state.currentPage > 1) {
      state.currentPage--;
      loadUsers();
    } else if (direction === 'next' && state.currentPage < totalPages) {
      state.currentPage++;
      loadUsers();
    }
  }

  // 검색이나 필터 변경 시 1페이지로 리셋
  const resetAndLoad = () => {
    state.currentPage = 1;
    loadUsers();
  };

  searchBtn.addEventListener('click', resetAndLoad);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') resetAndLoad(); });
  
  [adminFilter, banFilter].forEach(el => el.addEventListener('change', resetAndLoad));

  lineLimit.addEventListener('change', (e) => {
    state.limit = parseInt(e.target.value);
    resetAndLoad();
  });

  prevPageBtn.addEventListener('click', () => goPage('prev'));
  nextPageBtn.addEventListener('click', () => goPage('next'));

  userTableBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    history.pushState(null, '', `/admin/user/${tr.dataset.id}`);
    router();
  });

  loadUsers();
}