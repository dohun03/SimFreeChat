import { router } from '../app.js'

export async function renderCreateRoom(container, user) {
  if (!user) {
    history.pushState(null, '', '/login');
    await router();
    return;
  }

  container.innerHTML = `
    <div class="container mt-4" style="max-width: 450px;">
      <h2 class="mb-4 text-center">채팅방 생성</h2>
      <form id="create-room-form">
        <!-- 방 이름 -->
        <div class="mb-3">
          <label for="name" class="form-label">방 이름</label>
          <input type="text" class="form-control form-control-sm" id="name" placeholder="방 이름 입력">
        </div>

        <!-- 최대인원 -->
        <div class="mb-3">
          <label for="maxMembers" class="form-label">최대인원</label>
          <input type="text" class="form-control form-control-sm" id="maxMembers" placeholder="최대 인원 입력" min="2" max="50">
        </div>

        <!-- 비밀번호 -->
        <div class="mb-3">
          <label for="password" class="form-label">비밀번호</label>
          <input type="password" class="form-control form-control-sm" id="password" placeholder="비밀번호">
        </div>

        <button type="submit" class="btn btn-primary w-100 btn-sm">방 생성</button>
        <p id="register-msg" class="text-danger mt-2"></p>
      </form>
    </div>
  `;

  const form = document.getElementById('create-room-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const maxMembers = document.getElementById('maxMembers').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('register-msg');

    if (!name || !maxMembers) {
      errorMessage.innerText = '빈 칸을 입력하세요.';
      return;
    }

    const payload = {
      name,
      maxMembers: Number(maxMembers),
      password: password || undefined,
    };

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        errorMessage.innerText = '방 생성 실패:\n' + err.message.join('\n');
      }

      const data = await res.json();
      history.pushState(null, '', `/room/${data.id}`);
      await router();
    } catch (err) {
      console.error(err);
    }
  });
}
