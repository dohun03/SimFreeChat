import { router, navigate } from '../app.js';

export function renderHeader(user) {
  const header = document.getElementById("header");

  // 공통 HTML 구조
  header.innerHTML = `
    <div class="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
      <ul class="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
        <li><a href="/" class="nav-link px-2 text-secondary" data-link>SimFreeChat</a></li>
      </ul>
      <div class="text-end" id="user-menu"></div>
    </div>
  `;

  const userMenu = document.getElementById("user-menu");

  if (user) {
    // 로그인 상태 메뉴
    userMenu.innerHTML = `
      <div class="dropdown dropstart text-end">
        <a href="/" id="btn-user" class="d-block link-light text-decoration-none" data-bs-toggle="dropdown" aria-expanded="false">
          <img src="/img/default-avatar.png" alt="avatar" width="40" height="40" class="rounded-circle">
        </a>
        <ul class="dropdown-menu text-small" aria-labelledby="btn-user">
          <li${user.is_admin ? '':' style="display:none;"'}><a class="dropdown-item" href="/admin" data-link>관리자</a></li>
          <li><a class="dropdown-item" href="/profile" data-link>${user.username}님의 프로필</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" id="btn-logout">Sign out</a></li>
        </ul>
      </div>
    `;

    // 로그아웃 이벤트
    document.getElementById("btn-logout").addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      navigate("/login");
      renderHeader();
    });
  } else {
    // 비로그인 상태 메뉴
    userMenu.innerHTML = `
      <button type="button" class="btn btn-outline-light me-2" data-link href="/login">Login</button>
      <button type="button" class="btn btn-warning" data-link href="/register">Sign-up</button>
    `;
  }
}
