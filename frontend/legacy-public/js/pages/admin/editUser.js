import { formatDate, router } from '../../app.js';

export async function renderEditUser(container, user, userId) {
  if (!user || !user.isAdmin) {
    container.innerHTML = '<h2 class="text-center mt-5">권한이 없습니다.</h2>';
    return;
  }

  try {
    const res = await fetch(`/api/users/${userId}`, { method: 'GET' });
    if (!res.ok) throw new Error('유저 데이터를 불러오는 중 오류 발생');
    const user = await res.json();

    const isCurrentlyBanned = user.bannedUntil && new Date(user.bannedUntil) > new Date();
    const isPermanent = user.bannedUntil && new Date(user.bannedUntil).getFullYear() >= 2099;

    container.innerHTML = `
    <div class="container mt-4" style="max-width: 800px;">
      <div class="card shadow-sm p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="mb-0 fw-bold">${user.name} 관리</h2>
          ${isCurrentlyBanned 
            ? `<span class="badge bg-danger fs-6">현재 밴 상태 (${isPermanent ? '영구' : '기간제'})</span>` 
            : '<span class="badge bg-success fs-6">정상 상태</span>'}
        </div>

        <div class="row g-4">
          <div class="col-md-6 border-end">
            <h5 class="mb-3 text-muted">프로필 수정</h5>
            <form id="profile-form">
              <div class="mb-2">
                <label class="small text-muted">이름</label>
                <input type="text" id="name" placeholder="${user.name}" class="form-control form-control-sm" />
              </div>
              <div class="mb-2">
                <label class="small text-muted">이메일</label>
                <input type="email" id="email" placeholder="${user.email}" class="form-control form-control-sm" />
              </div>
              <div class="mb-2">
                <label class="small text-muted">새 비밀번호</label>
                <input type="password" id="password" class="form-control form-control-sm" placeholder="변경 시에만 입력" />
              </div>
              <button type="submit" class="btn btn-primary btn-sm w-100 mt-2">프로필 저장</button>
            </form>
          </div>

          <div class="col-md-6">
            <h5 class="mb-3 text-muted">계정 상태 제어</h5>
            <div class="p-3 bg-light rounded shadow-sm">
              <div class="mb-3">
                <label class="form-label small fw-bold">밴 기간 설정</label>
                <select id="ban-days" class="form-select form-select-sm">
                  <option value="">[밴 기간]</option>
                  <option value="1">1일 정지</option>
                  <option value="7">7일 정지</option>
                  <option value="30">30일 정지</option>
                  <option value="9999">영구 정지</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold">밴 사유</label>
                <input id="ban-reason" class="form-control form-control-sm" value="${user.banReason || ''}">
              </div>
              <div class="d-flex gap-2">
                <button id="ban-btn" class="btn ${isCurrentlyBanned ? 'btn-warning' : 'btn-danger'} btn-sm flex-fill">
                  ${isCurrentlyBanned ? '밴 정보 변경' : '계정 밴 하기'}
                </button>
                ${isCurrentlyBanned ? `<button id="unban-btn" class="btn btn-success btn-sm flex-fill">밴 해제</button>` : ''}
              </div>
              ${isCurrentlyBanned && !isPermanent ? `<div class="mt-2 small text-danger text-center">만료 예정: ${formatDate(user.bannedUntil)}</div>` : ''}
            </div>

            <div class="mt-4 pt-3 border-top">
              <button id="delete-btn" class="btn btn-outline-danger btn-sm w-100">계정 영구 삭제</button>
            </div>
          </div>
        </div>
        <p id="profile-msg" class="text-center mt-3 small"></p>
      </div>
    </div>
    `;

    setupEventListeners(userId);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<h2 class="text-center mt-5">유저 정보를 불러올 수 없습니다.</h2>';
  }
}

function setupEventListeners(userId) {
  const msg = document.getElementById('profile-msg');

  // 프로필 수정
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (name) payload.name = name;
    if (email) payload.email = email;
    if (password) payload.password = password;

    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { 
      msg.className = 'text-success mt-3'; 
      msg.innerText = '프로필이 저장되었습니다.'; 
    }
  });

  // 밴 적용/수정 
  document.getElementById('ban-btn').addEventListener('click', async () => {
    const banDays = document.getElementById('ban-days').value;
    const reason = document.getElementById('ban-reason').value;

    if (!banDays) return alert('밴 기간을 설정하세요.');
    if (!reason) return alert('사유를 입력해 주세요.');

    const res = await fetch(`/api/users/${userId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, banDays: parseInt(banDays) }),
    });

    if (res.ok) {
      alert('밴 설정이 완료되었습니다.');
      location.reload();
    } else {
      const errorData = await res.json();

      let finalMsg = '';
      if (Array.isArray(errorData.message)) {
        finalMsg = errorData.message.join('\n');
      } else {
        finalMsg = errorData.message || '알 수 없는 오류가 발생했습니다.';
      }

      alert(`요청 실패: ${finalMsg}`);
    }
  });

  // 밴 해제
  const unbanBtn = document.getElementById('unban-btn');
  if (unbanBtn) {
    unbanBtn.addEventListener('click', async () => {
      if (!confirm('밴을 해제하시겠습니까?')) return;
      const res = await fetch(`/api/users/${userId}/ban`, { method: 'DELETE' });
      if (res.ok) { 
        alert('밴이 해제되었습니다.'); 
        location.reload(); 
      }
    });
  }

  // 유저 삭제
  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (confirm('이 계정을 완전히 삭제하시겠습니까?')) {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) { 
        alert('삭제되었습니다.'); 
        history.pushState(null, '', '/admin'); 
        router(); 
      }
    }
  });
}