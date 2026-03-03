import { formatDate, router } from '../app.js';

export async function renderProfile(container, user) {
  if (!user) {
    history.pushState(null, '', '/login');
    await router();
    return;
  }

  container.innerHTML = `
    <div class="card p-4 mx-auto" style="max-width: 600px;">
      <h2>${user.name}님의 프로필 설정</h2>
      <form id="profile-form">
        <input type="text" id="name" placeholder="현재 아이디: ${user.name}" class="form-control mb-2" />
        <input type="email" id="email" placeholder="현재 이메일: ${user.email}" class="form-control mb-2" />
        <input type="password" id="password" placeholder="새 비밀번호" class="form-control mb-2" />
        <input type="password" id="confirmPassword" placeholder="비밀번호 확인" class="form-control mb-2" />
        <button type="submit" class="btn btn-primary w-100">저장하기</button>
      </form>
      <p id="profile-msg" class="text-danger mt-2"></p>
      <div class="mt-3 text-muted small">
      <p>가입일: ${formatDate(user.createdAt)}</p>
      <p>최근 수정일: ${user.createdAt!==user.updatedAt ? formatDate(user.updatedAt) : '없음'}</p>
    </div>
    </div>
  `;

  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password && password !== confirmPassword) {
      document.getElementById('profile-msg').innerText = '비밀번호 불일치';
      return;
    }

    const payload = {};
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (password) payload.password = password;

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById('profile-msg').innerText = '저장 완료';
      } else {
        document.getElementById('profile-msg').innerText = data.message || '저장 실패';
      }
    } catch {
      document.getElementById('profile-msg').innerText = '서버 오류';
    }
  });
}
