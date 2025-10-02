// js/register.js
export function renderRegister(container) {
  container.innerHTML = `
    <div class="card p-4 mx-auto" style="max-width: 400px;">
      <h2>회원가입</h2>
      <form id="register-form">
        <input type="text" id="username" placeholder="아이디" class="form-control mb-2" required />
        <input type="email" id="email" placeholder="이메일" class="form-control mb-2" required />
        <input type="password" id="password" placeholder="비밀번호" class="form-control mb-2" required />
        <input type="password" id="confirmPassword" placeholder="비밀번호 확인" class="form-control mb-2" required />
        <button type="submit" class="btn btn-success w-100">회원가입</button>
      </form>
      <p id="register-msg" class="text-danger mt-2"></p>
      <p class="mt-2">계정이 있으신가요? <a href="#/login">로그인</a></p>
    </div>
  `;

  const form = document.getElementById('register-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('register-msg');

    if (password !== confirmPassword) {
      errorMessage.innerText = '비밀번호 불일치';
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        location.hash = '#/login';
      } else {
        errorMessage.innerText = data.message || '회원가입 실패';
      }
    } catch {
      errorMessage.innerText = '서버 오류';
    }
  });
}
