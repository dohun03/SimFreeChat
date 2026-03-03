import { router } from '../app.js';

export function renderHeader(user) {
  const header = document.getElementById("header");

  // 헤더 스타일 강제 고정 (상단 가로바)
  header.className = "navbar navbar-dark bg-dark border-bottom border-dark border-3 py-2 sticky-top";
  header.style = ""; // 사이드바에서 썼던 인라인 스타일 제거

  header.innerHTML = `
    <div class="container" style="max-width: 1200px;">
      <a href="/" class="navbar-brand fw-black m-0 d-flex align-items-center" data-link style="letter-spacing: -1.5px; font-weight: 900; font-size: 1.6rem;">
        SimFreeChat
      </a>

      <div id="user-menu-container"></div>
    </div>
  `;

  const userMenuContainer = document.getElementById("user-menu-container");
  
  if (user) {
    userMenuContainer.innerHTML = `
      <div class="dropdown">
        <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" id="dropdownUser" data-bs-toggle="dropdown" aria-expanded="false">
          <span class="me-2 fw-bold small d-none d-sm-inline">${user.name}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end rounded-0 border-2 border-white shadow-lg mt-2">
          <li><a class="dropdown-item fw-bold small py-2 px-3" href="/profile" data-link>프로필 설정</a></li>
          ${user.isAdmin ? `
            <li><hr class="dropdown-divider border-secondary"></li>
            <li><a class="dropdown-item fw-bold text-warning small py-2 px-3" href="/admin" data-link>관리자 도구</a></li>
          ` : ''}
          <li><hr class="dropdown-divider border-secondary"></li>
          <li><button class="dropdown-item fw-bold small py-2 px-3 text-danger" id="btn-logout">로그아웃</button></li>
        </ul>
      </div>
    `;
    
    document.getElementById("btn-logout")?.addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    });
  } else {
    userMenuContainer.innerHTML = `
      <div class="d-flex gap-2">
        <a href="/login" class="btn btn-outline-light btn-sm rounded-0 fw-bold px-3 border-2" data-link>로그인</a>
        <a href="/register" class="btn btn-light btn-sm rounded-0 fw-bold px-3 text-dark border-2 border-white" data-link>회원가입</a>
      </div>
    `;
  }
}