import { formatDate, router } from '../../app.js';

export async function renderEditUser(container, user, userId) {
  if (!user || !user.isAdmin) {
    container.innerHTML = '<h2 class="text-center mt-5">권한이 없습니다.</h2>';
    return;
  }

  try {
    const res = await fetch(`/api/users/${userId}`, { method: 'GET' });
    if (!res.ok) throw new Error('유저 데이터를 불러오는 중 오류 발생');
    
    const userData = await res.json();

    container.innerHTML = `
    <div class="card p-4 mx-auto" style="max-width: 600px;">
      <h2>${userData.name}님의 프로필 설정</h2>
      <form id="profile-form">
        <input type="text" id="name" placeholder="현재 아이디: ${userData.name}" class="form-control mb-2" />
        <input type="email" id="email" placeholder="현재 이메일: ${userData.email}" class="form-control mb-2" />
        <input type="password" id="password" placeholder="새 비밀번호" class="form-control mb-2" />
        <input type="password" id="confirmPassword" placeholder="비밀번호 확인" class="form-control mb-2" />
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary flex-fill btn-sm">저장</button>
          <button type="button" class="btn btn-danger flex-fill btn-sm" id="delete-btn">삭제</button>
        </div>
      </form>
      <p id="profile-msg" class="text-danger mt-2"></p>
      <div class="mt-3 text-muted small">
        <p>가입일: ${formatDate(userData.createdAt)}</p>
        <p>최근 수정일: ${userData.createdAt !== userData.updatedAt ? formatDate(userData.updatedAt) : '없음'}</p>
      </div>
    </div>
  `;
  } catch (err) {
    console.error(err);
  }

  const form = document.getElementById('profile-form');
  const profileMsg = document.getElementById('profile-msg');
  const deleteBtn = document.getElementById('delete-btn');

  // 프로필 수정 이벤트
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password && password !== confirmPassword) {
      profileMsg.innerText = '비밀번호 불일치';
      return;
    }

    const payload = {};
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (password) payload.password = password;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        profileMsg.innerText = '저장 완료';
      } else {
        profileMsg.innerText = data.message || '저장 실패';
      }
    } catch {
      profileMsg.innerText = '서버 오류';
    }
  });

  // 유저 삭제 이벤트
  deleteBtn.addEventListener('click', async () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
          profileMsg.innerText = data.message || '유저 삭제 실패';
          return;
        }

        alert(data.message || '삭제 완료');
        history.pushState(null, '', '/admin');
        await router();
      } catch (err) {
        console.error(err);
        profileMsg.innerText = '서버 오류';
      }
    }
  });
}
