export function renderLogin(container) {
  container.innerHTML = `
    <div class="card p-4 mx-auto" style="max-width: 400px;">
      <h2>로그인</h2>
      <form id="login-form">
        <input type="text" id="username" placeholder="아이디" class="form-control mb-2" required />
        <input type="password" id="password" placeholder="비밀번호" class="form-control mb-2" required />
        <button type="submit" class="btn btn-primary w-100">로그인</button>
      </form>
      <p id="login-msg" class="text-danger mt-2"></p>
      <p class="mt-2">처음이세요? <a href="#/register">회원가입</a></p>
    </div>
  `;

  const form = document.getElementById('login-form');
  document.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        location.hash = '#/';
      } else {
        document.getElementById('login-msg').innerText = data.message || '로그인 실패';
      }
    } catch {
      document.getElementById('login-msg').innerText = '서버 오류';
    }
  });
}
