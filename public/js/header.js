import { router } from "./app.js";

export function renderHeader(user) {
  const header = document.getElementById('header');
  header.innerHTML = `
    <div>
      <div class="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">

        <ul class="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
          <li><a href="/" class="nav-link px-2 text-secondary">SimFreeChat</a></li>
          <li><a href="/features" class="nav-link px-2 text-white">Features</a></li>
          <li><a href="/pricing" class="nav-link px-2 text-white">Pricing</a></li>
          <li><a href="/faqs" class="nav-link px-2 text-white">FAQs</a></li>
          <li><a href="/about" class="nav-link px-2 text-white">About</a></li>
        </ul>

        <form class="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3">
          <input type="search" class="form-control form-control-dark" placeholder="Search..." aria-label="Search">
        </form>

        <!-- 유저 메뉴 -->
        <div class="text-end" id="user-menu">
          <button type="button" class="btn btn-outline-light me-2" onClick="document.location.href='/login'">Login</button>
          <button type="button" class="btn btn-warning" onClick="document.location.href='/register'">Sign-up</button>
        </div>
      </div>
    </div>
  `;

  //로그인 상태
  const userMenu = document.getElementById('user-menu');
  if (user) {
    userMenu.innerHTML = `
    <div class="dropdown dropstart text-end">
      <a href="/" id="btn-user" class="d-block link-light text-decoration-none"
        data-bs-toggle="dropdown" aria-expanded="false">
        <img src="/img/default-avatar.png" alt="avatar" width="40" height="40" class="rounded-circle">
      </a>
      <ul class="dropdown-menu text-small" aria-labelledby="btn-user">
        <li><a class="dropdown-item" href="/admin">관리자</a></li>
        <li><a class="dropdown-item" href="/profile">${user.username}님의 프로필</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" id="btn-logout">Sign out</a></li>
      </ul>
    </div>
    `;
    // 로그아웃
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      history.pushState(null, '', '/login');
      await router();
      renderHeader();
    });
  }
}
