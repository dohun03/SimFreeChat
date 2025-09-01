import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null; // User 형식으로 받거나, 없으면 null
  setUser: (user: User | null) => void; // () => User 형식의 파라미터 받는 함수, 리턴값은 없음(void)
}

const AuthContext = createContext<AuthContextType>({ // React의 Context API 함수, 전역 상태 공유용.
  user: null, // 기본값, 로그인 안한 상태
  setUser: () => {}
});

export const useAuth = () => useContext(AuthContext); // 현재 Context 값 ({ user, setUser }) 반환.
// 이제 다른 컴포넌트에서 const { user, setUser } = useAuth();로 쉽게 접근 가능.

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // 앱 시작 시 서버에서 로그인 정보 가져오기
  useEffect(() => {
    async function getProfile() {
      try {
        const res = await fetch("http://localhost:4000/auth/me", { credentials: "include" });
        if (res.ok) {
          setUser(await res.json());
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    getProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
