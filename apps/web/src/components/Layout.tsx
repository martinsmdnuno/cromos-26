import { Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { TabBar } from './TabBar';
import { Avatar } from './Avatar';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const { user } = useAuth();
  return (
    <div className="min-h-full bg-panini-cream flex flex-col">
      <header className="px-5 pt-3 pb-3 max-w-[800px] mx-auto w-full">
        <div className="flex justify-between items-center">
          <Logo />
          {user && <Avatar name={user.name} color="#7B4B9E" />}
        </div>
        <div className="mt-3">
          <TabBar />
        </div>
      </header>
      <main className="flex-1 max-w-[800px] mx-auto w-full pb-10">
        <Outlet />
      </main>
    </div>
  );
}
