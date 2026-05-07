import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

interface Tab {
  to: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { to: '/collection', label: 'Collection', icon: 'C' },
  { to: '/groups', label: 'Groups', icon: 'G' },
  { to: '/trades', label: 'Trades', icon: 'T' },
  { to: '/stats', label: 'Stats', icon: 'S' },
];

/**
 * Top-bar segmented control. Used on tablet/desktop (>= 768px). On mobile we use
 * BottomTabBar instead — see Layout.tsx for the responsive switch.
 */
export function TopTabBar() {
  return (
    <nav
      role="tablist"
      aria-label="Main"
      className="flex gap-1 bg-white border-2 border-panini-ink rounded-[14px] p-1"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            clsx(
              'flex-1 text-center py-2 text-[12px] font-semibold rounded-[10px] transition-colors',
              isActive ? 'bg-panini-ink text-white' : 'text-panini-ink hover:bg-panini-cream',
            )
          }
          role="tab"
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Fixed bottom tab bar for phones. 4 equal cells, each with an icon-letter inside
 * a colored chip + the label below. The container respects iOS safe-area-inset so
 * it sits above the home indicator. 56px tap targets (well above the 44px minimum).
 */
export function BottomTabBar() {
  return (
    <nav
      role="tablist"
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 bg-panini-cream border-t-2 border-panini-ink md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-wide font-mono uppercase',
                isActive ? 'text-panini-ink' : 'text-panini-ink/60',
              )
            }
            role="tab"
            aria-label={t.label}
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'flex items-center justify-center w-9 h-9 rounded-lg border-2 border-panini-ink font-display text-base transition-colors',
                    isActive ? 'bg-panini-ink text-white' : 'bg-white',
                  )}
                  aria-hidden="true"
                >
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

