import { escapeHtml } from './app.js'

export async function renderEditRoom(container, user, roomId) {
  if (!user) {
    location.hash = '#/login';
    return;
  }

  try {
    // 방 정보 조회
    const roomResponse = await fetch(`/rooms/${encodeURIComponent(roomId)}`, {
      method: 'GET',
      credentials: 'include',
    });
    const room = await roomResponse.json();
    if (!roomResponse.ok || room.owner.id!=user.id) {
      container.textContent = room.message || '존재하지 않거나 접근할 수 없는 방입니다.';
      return;
    }

    container.innerHTML = `
      <div class="container mt-4" style="max-width: 450px;">
        <h2 class="mb-4 text-center">채팅방 생성</h2>
        <form id="edit-room-form">
          <!-- 방 이름 -->
          <div class="mb-3">
            <label for="name" class="form-label">방 이름</label>
            <input type="text" class="form-control form-control-sm" id="name" placeholder="방 이름 입력" value="${escapeHtml(room.name)}">
          </div>

          <!-- 최대인원 -->
          <div class="mb-3">
            <label for="maxMembers" class="form-label">최대인원</label>
            <input type="number" class="form-control form-control-sm" id="maxMembers" placeholder="최대 인원 입력" min="2" max="50" value="${escapeHtml(room.maxMembers)}">
          </div>

          <!-- 비밀번호 -->
          <div class="mb-3">
            <label for="password" class="form-label">비밀번호</label>
            <input type="password" class="form-control form-control-sm" id="password" placeholder="비밀번호">
          </div>

          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary flex-fill btn-sm">저장</button>
            <button type="button" class="btn btn-danger flex-fill btn-sm" id="delete-btn">삭제</button>
          </div>
          <p id="result-msg" class="text-danger mt-2"></p>
        </form>
      </div>
    `;

    const form = document.getElementById('edit-room-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const maxMembers = document.getElementById('maxMembers').value;
      const password = document.getElementById('password').value;
      const resultMessage = document.getElementById('result-msg');

      if (!name || !maxMembers) {
        resultMessage.innerText = '빈 칸을 입력하세요.';
        return;
      }

      const payload = {
        name,
        maxMembers: Number(maxMembers),
        password: password || undefined,
      };

      try {
        const res = await fetch(`/rooms/${encodeURIComponent(roomId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const data = await res.json();

        if (!res.ok) {
          resultMessage.innerText = '방 수정 실패:\n' + data.message
          return;
        }

        resultMessage.innerText = '방 정보가 변경되었습니다.';
      } catch (err) {
        console.error(err);
      }
    });

    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.addEventListener('click', async () => {
      if (confirm('정말 삭제하시겠습니까?')) {
        try {
          const res = await fetch(`/rooms/${encodeURIComponent(roomId)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
  
          if (!res.ok) {
            const err = await res.json();
            resultMessage.innerText = '방 삭제 실패:\n' + err.message.join('\n');
          }
  
          alert(data.message);
          location.hash = `#/`;
        } catch (err) {
          console.error(err);
        }
      }
    });
  } catch (err) {
    console.log(err);
  }
}
