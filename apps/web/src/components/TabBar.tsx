import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useT } from '../i18n/LangContext';

interface Tab {
  to: string;
  /** i18n key for the visible label. */
  labelKey: string;
  icon: string;
}

const TABS: Tab[] = [
  { to: '/collection', labelKey: 'tab.collection', icon: 'C' },
  { to: '/groups', labelKey: 'tab.groups', icon: 'G' },
  { to: '/trades', labelKey: 'tab.trades', icon: 'T' },
  { to: '/stats', labelKey: 'tab.stats', icon: 'S' },
];

export function TopTabBar() {
  const { t } = useT();
  return (
    <nav
      role="tablist"
      aria-label="Main"
      className="flex gap-1 bg-white border-2 border-panini-ink rounded-[14px] p-1"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            clsx(
              'flex-1 text-center py-2 text-[12px] font-semibold rounded-[10px] transition-colors',
              isActive ? 'bg-panini-ink text-white' : 'text-panini-ink hover:bg-panini-cream',
            )
          }
          role="tab"
        >
          {t(tab.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

export function BottomTabBar() {
  const { t } = useT();
  return (
    <nav
      role="tablist"
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 bg-panini-cream border-t-2 border-panini-ink md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-wide font-mono uppercase',
                isActive ? 'text-panini-ink' : 'text-panini-ink/60',
              )
            }
            role="tab"
            aria-label={t(tab.labelKey)}
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
                  {tab.icon}
                </span>
                <span>{t(tab.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
