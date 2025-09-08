import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [message, setMessage] = useState<string>("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [savedProfile, setSavedProfile] = useState({
    username: "",
    email: "",
  });
  const [editMode, setEditMode] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // 👇 비밀번호 표시 여부
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });

  const inputRefs = {
    username: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirmPassword: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    async function getProfile() {
      try {
        const res = await fetch("http://localhost:4000/users/me", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setForm({
            username: data.username || "",
            email: data.email || "",
            password: "",
            confirmPassword: "",
          });
          setSavedProfile({
            username: data.username || "",
            email: data.email || "",
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
    getProfile();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const updatedEditMode: typeof editMode = { ...editMode };
      let changed = false;

      (Object.keys(inputRefs) as (keyof typeof inputRefs)[]).forEach((key) => {
        if (
          editMode[key] &&
          inputRefs[key].current &&
          !inputRefs[key].current!.contains(target)
        ) {
          updatedEditMode[key] = false;
          changed = true;
        }
      });

      if (changed) setEditMode(updatedEditMode);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [editMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFocus = (field: string) => {
    setEditMode({ ...editMode, [field]: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const usernameRegex = /^(?:[가-힣]{2,12}|[a-zA-Z0-9]{2,12})$/;
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/;

    if (form.password !== form.confirmPassword) {
      setMessage("비밀번호가 일치하지 않습니다");
      return;
    }

    const payload: Partial<typeof form> = {};
    if (form.username && form.username !== savedProfile.username) {
      if (!usernameRegex.test(form.username)) {
        setMessage("아이디는 한글(2~12자) 또는 영문/숫자 조합(2~12자)만 가능합니다.");
        return;
      }
      payload.username = form.username;
    }
    if (form.email && form.email !== savedProfile.email) {
      payload.email = form.email;
    }
    if (form.password) {
      if (!passwordRegex.test(form.password)) {
        setMessage("비밀번호는 4~16자의 영문 또는 숫자만 가능합니다.");
        return;
      }
      payload.password = form.password;
    }

    if (Object.keys(payload).length === 0) {
      setMessage("변경된 내용이 없습니다.");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSavedProfile({
          username: data.username || savedProfile.username,
          email: data.email || savedProfile.email,
        });
        setForm({
          username: data.username || savedProfile.username,
          email: data.email || savedProfile.email,
          password: "",
          confirmPassword: "",
        });
        setEditMode({
          username: false,
          email: false,
          password: false,
          confirmPassword: false,
        });
        setUser({ username: data.username || savedProfile.username });
        setMessage("저장 되었습니다.");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const renderInput = (
    label: string,
    name: keyof typeof form,
    type: string = "text"
  ) => {
    const isChanged =
      (name === "username" || name === "email") &&
      form[name] !== savedProfile[name];

    const isPasswordField = name === "password" || name === "confirmPassword";

    return (
      <div>
        <div className="relative">
          <input
            ref={inputRefs[name]}
            type={
              isPasswordField && showPassword[name as "password" | "confirmPassword"]
                ? "text"
                : type
            }
            name={name}
            value={form[name]}
            onChange={handleChange}
            onFocus={() => handleFocus(name)}
            readOnly={!editMode[name]}
            placeholder={label}
            className={`w-full px-4 py-3 border rounded-md focus:outline-none ${
              editMode[name]
                ? isChanged || (isPasswordField && form[name])
                  ? "border-green-500 ring-2 ring-green-400"
                  : "focus:ring-2 focus:ring-blue-500"
                : "bg-gray-100 text-gray-500 cursor-pointer"
            }`}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() =>
                setShowPassword((prev) => ({
                  ...prev,
                  [name]: !prev[name as "password" | "confirmPassword"],
                }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
            >
              {showPassword[name as "password" | "confirmPassword"]
                ? "숨기기"
                : "표시"}
            </button>
          )}
        </div>
        {isChanged && <p className="text-xs text-green-600 mt-1">변경됨</p>}
        {isPasswordField && form[name] && (
          <p className="text-xs text-green-600 mt-1">입력됨</p>
        )}
      </div>
    );    
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-md rounded-lg flex w-full max-w-4xl">
        <div className="w-1/3 border-r p-6 flex flex-col items-center">
          <img
            src="http://localhost:4000/public/default-avatar.png"
            alt="프로필"
            className="w-24 h-24 rounded-full mb-4"
          />
          <h2 className="text-lg font-semibold mb-6">
            {savedProfile.username || "사용자"}님의 프로필
          </h2>
          <nav className="w-full">
            <ul className="space-y-3 text-gray-700">
              <li className="px-3 py-2 rounded-md bg-blue-100 font-medium cursor-pointer">
                프로필
              </li>
              <li className="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
                개인설정
              </li>
            </ul>
          </nav>
        </div>

        <div className="w-2/3 p-10">
          <h1 className="text-2xl font-bold mb-2">프로필 설정</h1>
          <p className="text-gray-600 mb-6 text-sm">
            프로필과 보안 정보를 수정할 수 있습니다.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderInput("닉네임", "username")}
            {renderInput("이메일", "email", "email")}
            {renderInput("새 비밀번호", "password", "password")}
            {renderInput("비밀번호 확인", "confirmPassword", "password")}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition"
            >
              저장하기
            </button>
          </form>
          {message && (
            <p className="text-center text-sm mt-4 text-red-500">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
