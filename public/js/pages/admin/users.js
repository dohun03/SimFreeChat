import { router, formatDate } from "../../app.js";

export async function renderAdminUsers(container, user) {
  if (!user || !user.is_admin) {
    container.innerHTML = '<h2 class="text-center mt-5">권한이 없습니다.</h2>';
    return;
  }

  container.innerHTML = `
    <div class="container mt-4">
      <h2 class="mb-3">유저 관리</h2>

      <!-- 검색창 -->
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="input-group">
            <input type="text" id="user-search" class="form-control" placeholder="유저 검색 (ID, 이름, 이메일)">
            <button class="btn btn-primary" id="search-btn">검색</button>
          </div>
        </div>
      </div>

      <!-- 유저 테이블 (스크롤형) -->
      <div class="table-responsive" 
           style="max-height: 500px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px;">
        <table class="table table-hover table-bordered align-middle mb-0">
          <col style="width: 5%">
          <col style="width: 15%">
          <col>
          <col style="width: 20%">
          <col style="width: 10%">
          <col style="width: 15%">
          <thead class="table-light" style="position: sticky; top: 0; z-index: 2;">
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>이메일</th>
              <th>가입일</th>
              <th>권한</th>
              <th>액션</th>
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

  async function renderTable(search = '') {
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error('유저 데이터를 불러오는 중 오류 발생');
      
      const users = await res.json();
      userTableBody.innerHTML = '';

      users.forEach((user) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${formatDate(user.created_at)}</td>
          <td>${user.is_admin ? '<b>관리자</b>' : '사용자'}</td>
          <td>
            <button class="btn btn-sm btn-warning me-1">수정</button>
            <button class="btn btn-sm btn-danger">삭제</button>
          </td>
        `;
        userTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  searchBtn.addEventListener('click', () => {
    renderTable(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      renderTable(searchInput.value);
    }
  });

  renderTable();
}
