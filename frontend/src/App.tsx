import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Header from "./components/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <div className="p-4 text-red-500 text-center mt-20 text-lg">
              이미 로그인된 상태입니다.
            </div>
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={user ? (
          <div className="p-4 text-red-500 text-center mt-20 text-lg">
            이미 로그인된 상태입니다.
          </div>
        ) : (
          <Register />
        )}
      />
      <Route path="/" element={<div>홈 화면</div>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
