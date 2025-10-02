import { renderHeader } from './header.js';
import { renderLogin } from './login.js';
import { renderRegister } from './register.js';
import { renderProfile } from './profile.js';
import { renderCreateRoom } from './createRoom.js';
import { renderRoomsList } from './rooms.js';
import { leaveChatRoom, renderChatRoom } from './chat.js';

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

// 창 닫기, 새로고침, 페이지 이동 시 발생
window.addEventListener('beforeunload', () => {
  leaveChatRoom();
});

const app = document.getElementById('app');
// 라우팅 처리 (간단 hash 방식)
async function router() {
  const path = location.hash.replace('#', '') || '/';
  app.innerHTML = '';
  const res = await fetch("/users/me", { credentials: "include" });
  const user = res.ok ? await res.json() : null;

  leaveChatRoom();
  renderHeader(user);

  switch (true) {
    case path === '/login':
      renderLogin(app);
      break;
    case path === '/register':
      renderRegister(app);
      break;
    case path === '/profile':
      renderProfile(app);
      break;
    case path === '/create-room':
      renderCreateRoom(app, user);
      break;
    case path.startsWith('/room/'):
      const roomId = path.split('/')[2];
      renderChatRoom(app, user, roomId);
      break;
    case path === '/':
      renderRoomsList(app);
      break;
    default:
      app.innerHTML = '<h2 class="text-center mt-5">페이지를 찾을 수 없습니다.</h2>';
  }
}

// 초기 실행
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
