import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/settings/Profile";
import RoomsList from "./pages/rooms/RoomsList";
import Header from "./components/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RoomForm from "./pages/rooms/RoomForm";
import ChatRoom from "./pages/rooms/ChatRoom";

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<RoomsList />} />
      <Route path="/rooms/:roomId" element={<ChatRoom />} />
      <Route path="/rooms/new" element={<RoomForm/>}></Route>
      <Route path="/rooms/:roomId/edit" element={<RoomForm/>}></Route>
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
      <Route 
        path="/settings/profile" 
        element={!user ? (
          <div className="p-4 text-red-500 text-center mt-20 text-lg">
          로그인 후 이용하시기 바랍니다.
        </div>
        ): (
          <Settings/>
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
        <div className="bg-gray-100 min-h-screen">
          <Header />
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
