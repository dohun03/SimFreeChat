import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { AppLayout } from './layout/AppLayout';
import { RoomsPage } from './pages/RoomsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { EditRoomPage } from './pages/EditRoomPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { RequireAuth } from './providers/RequireAuth';
import { AdminUserList } from './pages/admin/AdminUserList';
import { AdminMessageLogs } from './pages/admin/AdminMessageLogs';
import { AdminUserProfile } from './pages/admin/AdminUserProfile';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoomsPage />} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/create-room" element={<RequireAuth><CreateRoomPage /></RequireAuth>} />
          <Route path="/edit-room/:roomId" element={<RequireAuth><EditRoomPage /></RequireAuth>} />
          <Route path="/room/:roomId" element={<RequireAuth><ChatRoomPage /></RequireAuth>} />

          {/* ✅ 관리자 중첩 라우팅 구성 */}
          <Route 
            path="/admin/users" 
            element={<RequireAuth><AdminUserList /></RequireAuth>} 
          />
          <Route 
            path="/admin/users/:userId" 
            element={<RequireAuth><AdminUserProfile /></RequireAuth>} 
          />
          <Route 
            path="/admin/messagelog" 
            element={<RequireAuth><AdminMessageLogs /></RequireAuth>} 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

