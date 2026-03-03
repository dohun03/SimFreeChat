import { renderAdminUsers } from './users.js';
import { renderAdminMessageLogs } from './messageLogs.js';

export function renderAdmin(container, user, currentTab = 'users') {
  if (!user || !user.isAdmin) {
    container.innerHTML = '<h2 class="text-center mt-5">관리자 권한이 필요합니다.</h2>';
    return;
  }

  container.innerHTML = `
    <div class="admin-container" style="font-family:Arial,sans-serif;">
      <header class="d-flex align-items-center justify-content-between mb-3">
        <h2 class="mb-0">관리자 대시보드</h2>
        <nav>
          <ul class="nav nav-tabs">
            <li class="nav-item">
              <a class="nav-link" href="#" data-tab="users">사용자 목록</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-tab="message-logs">메시지 로그 확인</a>
            </li>
          </ul>
        </nav>
      </header>
      <main id="admin-content" class="p-3 rounded border border-top-0 bg-white"></main>
    </div>
  `;

  const content = container.querySelector('#admin-content');
  const links = container.querySelectorAll('.nav-link');

  // 활성 탭 표시
  links.forEach(link => {
    link.classList.toggle('active', link.dataset.tab === currentTab);
  });

  // 클릭 이벤트
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;

      // active 상태 변경
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // 탭 렌더링
      renderAdminContent(content, user, tab);
    });
  });

  // 초기 렌더링
  renderAdminContent(content, user, currentTab);
}

function renderAdminContent(contentContainer, user, tab) {
  contentContainer.innerHTML = '';

  switch (tab) {
    case 'users':
      renderAdminUsers(contentContainer, user);
      break;
    case 'message-logs':
      renderAdminMessageLogs(contentContainer, user);
      break;
    default:
      contentContainer.innerHTML = '<p>선택된 메뉴가 없습니다.</p>';
  }
}
