import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Room {
  id: number;
  name: string;
  owner: { id: number; username: string };
  maxMembers: number;
  isPrivate: boolean;
  currentMembers?: number;
}

export default function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:4000/rooms?search=${search}`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setRooms(data))
      .finally(() => setLoading(false));
  }, [search]);

  const handleCreateRoom = () => {

  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-center justify-between px-4 py-3 mb-8 bg-gray-800 rounded-md">
        <button
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Link to="/rooms/new">방 생성</Link>
        </button>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="방 제목 검색..."
            className="w-72 px-4 py-2 rounded-md text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition"
            onClick={() => alert(`검색: ${search}`)}
          >
            검색
          </button>
        </div>
      </div>

      {/* 채팅방 리스트 */}
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <div className="overflow-hidden border rounded-lg shadow-sm bg-white">
          <table className="w-full text-left border-collapse">
            <colgroup>
              <col className="w-[70%]" />   {/* 방 이름 */}
              <col className="w-[10%]" />   {/* 방장 */}
              <col className="w-[10%]" />   {/* 인원 */}
              <col className="w-[10%]" />   {/* 공개 여부 */}
            </colgroup>
            <thead className="bg-gray-200 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 border-b">방 이름</th>
                <th className="px-4 py-3 border-b">방장</th>
                <th className="px-4 py-3 border-b text-center">인원</th>
                <th className="px-4 py-3 border-b text-center">공개 여부</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rooms.map((room) => (
                <tr
                  key={room.id}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  <td className="px-4 py-3 border-b font-medium text-gray-900">
                    {room.name}
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">
                    {room.owner.username}
                  </td>
                  <td className="px-4 py-3 border-b text-center text-gray-600">
                    {room.currentMembers ?? "?"}/{room.maxMembers}
                  </td>
                  <td className="px-4 py-3 border-b text-center">
                    {room.isPrivate ? "🔒 비공개" : "🌐 공개"}
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    채팅방이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
