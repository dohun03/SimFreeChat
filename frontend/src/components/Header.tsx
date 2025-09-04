import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Header() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 드롭다운 밖 클릭 시 닫기
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:4000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null); // Context 갱신
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-gray-800 text-white flex justify-between items-center px-8 py-5 shadow-md z-50">
      <div className="flex items-center space-x-2 text-xl font-bold">
        <Link to="/">SimFreeChat</Link>
      </div>

      <div className="relative text-xl">
        {user ? (
          <div ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="hover:underline focus:outline-none"
            >
              {user.username}님 ▾
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-md shadow-md py-1 z-50">
                <Link
                  to="/settings/profile"
                  className="flex items-center px-4 py-2 hover:bg-gray-700 space-x-2"
                  onClick={() => setIsOpen(false)}
                >
                  설정
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 hover:bg-gray-700 space-x-2"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="hover:underline">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
