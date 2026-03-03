import { escapeHtml, router } from '../app.js'

export async function renderBanManagerByRoom(container, user, roomId) {
  if (!user) {
    history.pushState(null, '', '/login');
    await router();
    return;
  }

  try {
    // 방 정보 조회
    const roomRes = await fetch(`/api/rooms/${roomId}`, {
      method: 'GET',
      credentials: 'include',
    });
    const room = await roomRes.json();
    if (!roomRes.ok || room.owner.id != user.id) {
      container.textContent = '존재하지 않거나 접근할 수 없는 방입니다.';
      return;
    }

    // 밴 유저 정보 조회
    const roomUsersRes = await fetch(`/api/room-users/${roomId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!roomUsersRes.ok) {
      container.textContent = '존재하지 않거나 접근할 수 없는 방입니다.';
      return;
    }
    const roomUsers = await roomUsersRes.json();

    container.innerHTML = `
      <div class="container mt-4" style="max-width: 600px;">
        <h2 class="mb-4 text-center"><b>${escapeHtml(room.name)}</b></h2>
        <div class="mb-4 text-center">밴 유저 관리</div>
        <ul id="banned-users-list" class="list-group"></ul>
      </div>
    `;

    const listEl = document.getElementById('banned-users-list');

    roomUsers.forEach(u => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.dataset.id = u.user.id;

      li.innerHTML = `
        <div>
          <strong>${escapeHtml(u.user.name)}</strong><br>
          <small class="text-muted">사유: ${escapeHtml(u.banReason)}</small>
        </div>
        <button class="btn btn-sm btn-warning remove-ban-btn">해제</button>
      `;
      listEl.appendChild(li);
    });

    // 삭제 버튼 이벤트
    listEl.querySelectorAll('.remove-ban-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const li = e.target.closest('li');
        const userId = li.dataset.id;
        if (!confirm('정말 이 사용자의 밴을 해제하시겠습니까?')) return;

        try {
          const res = await fetch(`/api/room-users/${roomId}/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (!res.ok) {
            alert('밴 해제 실패');
            return;
          }

          li.remove();
        } catch (err) {
          console.error(err);
          alert('밴 해제 중 오류가 발생했습니다.');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.textContent = '서버 에러가 발생했습니다.';
  }
}
