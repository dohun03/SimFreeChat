import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-6 text-sm text-slate-600">로딩 중...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

