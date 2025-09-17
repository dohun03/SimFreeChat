// js/profile.js
export function renderProfile(container) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) {
    location.hash = '#/login';
    return;
  }

  container.innerHTML = `
    <div class="card p-4 mx-auto" style="max-width: 600px;">
      <h2>프로필 설정</h2>
      <form id="profile-form">
        <input type="text" id="username" placeholder="닉네임" class="form-control mb-2" value="${user.username}" required />
        <input type="email" id="email" placeholder="이메일" class="form-control mb-2" value="${user.email || ''}" required />
        <input type="password" id="password" placeholder="새 비밀번호" class="form-control mb-2" />
        <input type="password" id="confirmPassword" placeholder="비밀번호 확인" class="form-control mb-2" />
        <button type="submit" class="btn btn-primary w-100">저장하기</button>
      </form>
      <p id="profile-msg" class="text-danger mt-2"></p>
    </div>
  `;

  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password && password !== confirmPassword) {
      document.getElementById('profile-msg').innerText = '비밀번호 불일치';
      return;
    }

    const payload = { username, email };
    if (password) payload.password = password;

    try {
      const res = await fetch('http://localhost:4000/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data));
        document.getElementById('profile-msg').innerText = '저장 완료';
      } else {
        document.getElementById('profile-msg').innerText = data.message || '저장 실패';
      }
    } catch {
      document.getElementById('profile-msg').innerText = '서버 오류';
    }
  });
}
