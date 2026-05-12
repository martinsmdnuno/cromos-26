import { Link, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { BottomTabBar, TopTabBar } from './TabBar';
import { AvatarMenu } from './AvatarMenu';
import { LangToggle } from './LangToggle';
import { ScrollDebugOverlay } from './ScrollDebugOverlay';
import { useT } from '../i18n/LangContext';

/**
 * Responsive shell:
 *  - mobile (< 768px): wordmark on top, no top tab bar, BOTTOM tab bar fixed.
 *    Main content gets bottom padding so the last row isn't hidden behind the bar.
 *  - tablet/desktop (>= 768px): wordmark + top tab bar in the header, no bottom bar.
 */
export function Layout() {
  const { t } = useT();
  return (
    <div className="min-h-dvh bg-panini-cream flex flex-col">
      <header className="px-5 pt-3 pb-3 max-w-[800px] mx-auto w-full">
        <div className="flex justify-between items-center gap-2">
          <Logo />
          <div className="flex items-center gap-2">
            <LangToggle />
            <AvatarMenu />
          </div>
        </div>
        {/* Top tab bar only on tablet+ */}
        <div className="mt-3 hidden md:block">
          <TopTabBar />
        </div>
      </header>

      <main className="flex-1 max-w-[800px] mx-auto w-full pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-10">
        <Outlet />
      </main>

      <footer className="hidden md:flex justify-center gap-4 pt-4 pb-6 label-mono opacity-50">
        <Link to="/legal/terms" className="hover:opacity-100">
          {t('menu.terms')}
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/privacy" className="hover:opacity-100">
          {t('menu.privacy')}
        </Link>
      </footer>

      {/* Bottom tab bar only on mobile */}
      <BottomTabBar />

      {/* Diagnostic overlay opt-in via `?debug=scroll`. Off in normal use. */}
      <ScrollDebugOverlay />
    </div>
  );
}
