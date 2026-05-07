import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const TABS = [
  { to: '/collection', label: 'Collection' },
  { to: '/groups', label: 'Groups' },
  { to: '/trades', label: 'Trades' },
  { to: '/stats', label: 'Stats' },
];

/**
 * Segmented control. On mobile it lives near the top under the wordmark (matches mockups).
 * On desktop (md+) it can be reused at the top with a wider container.
 */
export function TabBar() {
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
