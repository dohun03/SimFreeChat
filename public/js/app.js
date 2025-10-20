import { renderHeader } from './pages/header.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderProfile } from './pages/profile.js';
import { renderCreateRoom } from './pages/createRoom.js';
import { renderEditRoom } from './pages/editRoom.js';
import { renderChatRoom, leaveChatRoom } from './pages/chat.js';
import { renderRoomsList } from './pages/rooms.js';
import { renderAdmin } from './pages/admin/index.js';
import { renderEditUser } from './pages/admin/editUser.js';

// XSS 방지 함수
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 날짜 포맷 함수
export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

const app = document.getElementById('app');
// 라우팅 처리 (간단 hash 방식)
export async function router() {
  // location.hash 대신 location.pathname 사용
  const path = location.pathname || '/';
  app.innerHTML = '';

  const res = await fetch("/api/users/me", { credentials: "include" });
  const user = res.ok ? await res.json() : null;

  leaveChatRoom();
  renderHeader(user);

  switch (true) {
    case path === '/login':
      renderLogin(app, user);
      break;
    case path === '/register':
      renderRegister(app, user);
      break;
    case path === '/profile':
      renderProfile(app, user);
      break;
    case path === '/admin':
      renderAdmin(app, user);
      break;
    case path.startsWith('/admin/user/'): {
      const userId = path.split('/')[3];
      renderEditUser(app, user, userId);
      break;
    }
    case path === '/create-room':
      renderCreateRoom(app, user);
      break;
    case path.startsWith('/edit-room/'): {
      const roomId = path.split('/')[2];
      renderEditRoom(app, user, roomId);
      break;
    }
    case path.startsWith('/room/'): {
      const roomId = path.split('/')[2];
      renderChatRoom(app, user, roomId);
      break;
    }
    case path === '/':
      renderRoomsList(app);
      break;
    default:
      app.innerHTML = '<h2 class="text-center mt-5">페이지를 찾을 수 없습니다.</h2>';
  }
}

// DOM 전부 생성후 실행
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // 외부 링크면 무시
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return;

    // Ctrl / Cmd / Shift / 중클릭 → 기본 동작 유지
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

    e.preventDefault();
    navigate(url.pathname);
  });
  router();
});
// 창 닫기, 새로고침, 페이지 이동 시 실행
window.addEventListener('beforeunload', () => {
  leaveChatRoom();
});
// 브라우저 뒤로가기 / 앞으로가기 감지
window.addEventListener('popstate', router);

// SPA 내부에서 이동할 때
export function navigate(path) {
  history.pushState({}, '', path);
  router();
}