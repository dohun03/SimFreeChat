import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


export default function Login() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const navigate = useNavigate();

  const [user, setUser] = useState<{ username: string } | null>(null);

  // useEffect(() => {
  //   async function getProfile() {
  //     try {
  //       const res = await fetch("http://localhost:4000/auth/me", {
  //         method: "GET",
  //         credentials: "include",
  //       });

  //       const data = await res.json();

  //       console.log(data);

  //       if (!res.ok) {
  //         console.log(data.message || "로그인 실패");
  //         return;
  //       }

  //       setUser(data);
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   }

  //   getProfile();
  // }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
    
      const data = await res.json();
    
      if (!res.ok) {
        setMessage(data.message || "로그인 실패");
        return;
      }
    
      setMessage("로그인 성공!");
      window.location.href = "/";
    } catch (err) {
      setMessage("예기치 않은 에러가 발생했습니다.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-md rounded-lg p-10 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2">로그인하세요</h1>
        <p className="text-gray-600 mb-6 text-sm">
          다양한 사람들과 즐겨보세요!
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-sm text-blue-600"
            >
              {showPassword ? "숨기기" : "표시"}
            </button>
          </div>

          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              비밀번호를 잊으셨나요?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition"
          >
            로그인
          </button>
        </form>

        {message && (
          <p className="text-center text-sm mt-4 text-red-500">{message}</p>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          처음이세요?{" "}
          <a
            href="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            회원 가입
          </a>
        </p>
      </div>
    </div>
  );
}