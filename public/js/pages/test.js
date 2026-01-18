export function renderTest(container, user) {
  container.innerHTML = `<div id="chatMessages">
  <ul id="messagesList"></ul>
</div>
`

const chatMessages = document.getElementById('chatMessages');
const messagesList = document.getElementById('messagesList');

let loading = false;
let msgId = 100;

/* 테스트용 메시지 생성 */
function makeMessages(count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.textContent = `message ${msgId--}`;
    frag.appendChild(li);
  }
  return frag;
}

/* 초기 메시지 */
messagesList.appendChild(makeMessages(20));
chatMessages.scrollTop = chatMessages.scrollHeight;

/* 🔥 핵심: prepend + scroll 유지 */
function loadBefore() {
  if (loading) return;
  loading = true;

  const anchor = messagesList.firstElementChild;
  const anchorTop = anchor.getBoundingClientRect().top;

  messagesList.prepend(makeMessages(10));

  requestAnimationFrame(() => {
    const newTop = anchor.getBoundingClientRect().top;
    chatMessages.scrollTop += (newTop - anchorTop);
    loading = false;
  });
}

/* 스크롤 이벤트 */
chatMessages.addEventListener('scroll', () => {
  if (chatMessages.scrollTop <= 5) {
    loadBefore();
  }
});

}