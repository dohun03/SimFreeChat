import { Outlet } from 'react-router-dom';
import { Header } from '../ui/Header';

export function AppLayout() {
  return (
    // 전체 화면 높이를 100% 차지하게 하되, 밖으로 스크롤이 안 새게 막음
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50"> 
      <Header />
      
      {/* main 영역에 overflow-y-auto를 주면 
        헤더는 상단에 고정되고, 아래 내용(Outlet)만 스크롤됩니다. 
      */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}