import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);  
  const [message, setMessage] = useState<string>("");
  
  const usernameRegex = /^(?:[가-힣]{2,12}|[a-zA-Z0-9]{2,12})$/;
  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/;

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log('테스트',usernameRegex.test(username));
    if (!usernameRegex.test(username)) {
      setMessage("아이디는 한글(2~12자) 또는 영문/숫자 조합(2~12자)만 가능합니다.");
      return;
    }

    if (!passwordRegex.test(password)) {
      setMessage("비밀번호는 4~16자의 영문 또는 숫자만 가능합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("비밀번호가 일치하지 않습니다");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, email }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        setMessage(errorData.message || "기타 에러가 발생했습니다.");
        return;
      }

      const data = await res.json();
      console.log(data);
      setMessage("회원가입 성공!");
      navigate("/login", { replace: true }); // 이전 페이지 못가는 옵션
    } catch (err) {
      console.error(err);
      setMessage("회원가입에 실패했습니다");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-md rounded-lg p-10 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2">회원가입</h1>
        <p className="text-gray-600 mb-6 text-sm">
          다양한 사람들과 즐겨보세요!
        </p>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-sm text-blue-600"
            >
              {showConfirmPassword ? "숨기기" : "표시"}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition"
          >
            회원가입
          </button>
        </form>

        {message && (
          <p className="text-center text-sm mt-4 text-red-500">{message}</p>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          이미 계정이 있으신가요?{" "}
          <a
            href="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            로그인
          </a>
        </p>
      </div>
    </div>
  );
}
