import React from "react";

const users = [
  { id: 1, name: "홍길동", online: true },
  { id: 2, name: "철수", online: false },
  { id: 3, name: "영희", online: true },
  { id: 4, name: "민수", online: false },
];

export default function ChatRoom() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="w-1/2 h-[90vh] bg-white rounded-xl flex flex-col border">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 bg-gray-300 border-b mt-2">
          <h2 className="text-lg font-bold">채팅방 이름</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="검색"
              className="border rounded px-3 py-2 text-sm"
            />
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
              검색
            </button>
          </div>
        </div>
        {/* 본문: 채팅 영역 + 유저 목록 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 채팅 영역 */}
          <div className="flex-1 flex flex-col p-4">
            {/* 메시지 영역 (세로 60%) */}
            <div className="flex-1 overflow-y-auto space-y-4 h-[60%]">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div>
                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                    상대 메세지 내용
                  </div>
                  <div className="text-xs text-gray-400 mt-1">오후 3:20</div>
                </div>
              </div>
              <div className="flex justify-end">
                <div>
                  <div className="bg-blue-500 text-white px-3 py-2 rounded-lg">
                    내 메세지 내용
                  </div>
                  <div className="text-xs text-gray-400 text-right mt-1">
                    오후 3:21
                  </div>
                </div>
              </div>
            </div>
            {/* 입력 영역 */}
            <div className="flex items-center gap-2 mt-2">
              <button className="px-3 py-2 bg-gray-200 rounded-lg text-sm font-medium">
                📎 파일
              </button>
              <input
                type="text"
                placeholder="메시지를 입력하세요..."
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium">
                전송
              </button>
            </div>
          </div>
          {/* 유저 목록 사이드바 */}
          <div className="w-40 border-l p-3 bg-gray-50 overflow-y-auto">
            <h3 className="text-sm font-bold mb-2">참여자</h3>
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      user.online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span>{user.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
