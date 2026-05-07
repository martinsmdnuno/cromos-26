import { Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { BottomTabBar, TopTabBar } from './TabBar';
import { Avatar } from './Avatar';
import { useAuth } from '../hooks/useAuth';

/**
 * Responsive shell:
 *  - mobile (< 768px): wordmark on top, no top tab bar, BOTTOM tab bar fixed.
 *    Main content gets bottom padding so the last row isn't hidden behind the bar.
 *  - tablet/desktop (>= 768px): wordmark + top tab bar in the header, no bottom bar.
 */
export function Layout() {
  const { user } = useAuth();
  return (
    <div className="min-h-full bg-panini-cream flex flex-col">
      <header className="px-5 pt-3 pb-3 max-w-[800px] mx-auto w-full">
        <div className="flex justify-between items-center">
          <Logo />
          {user && <Avatar name={user.name} color="#7B4B9E" />}
        </div>
        {/* Top tab bar only on tablet+ */}
        <div className="mt-3 hidden md:block">
          <TopTabBar />
        </div>
      </header>

      <main className="flex-1 max-w-[800px] mx-auto w-full pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-10">
        <Outlet />
      </main>

      {/* Bottom tab bar only on mobile */}
      <BottomTabBar />
    </div>
  );
}
