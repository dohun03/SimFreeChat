import { renderHeader } from './header.js';
import { renderLogin } from './login.js';
import { renderRegister } from './register.js';
import { renderProfile } from './profile.js';
import { renderCreateRoom } from './createRoom.js';
import { renderEditRoom } from './editRoom.js';
import { renderRoomsList } from './rooms.js';
import { renderChatRoom, leaveChatRoom } from './chat.js';

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

// 창 닫기, 새로고침, 페이지 이동 시 발생
window.addEventListener('beforeunload', () => {
  leaveChatRoom();
});

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

// 이벤트는 hashchange 대신 popstate 사용
window.addEventListener('popstate', router);
window.addEventListener('load', router);

// SPA 내부에서 이동할 때
export function navigate(path) {
  history.pushState({}, '', path);
  router();
}