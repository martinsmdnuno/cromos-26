import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/LangContext';
import { Avatar } from './Avatar';

/**
 * Header avatar that opens a small dropdown with profile info, legal links, and a
 * sign-out button. Closes on outside click, Escape, or following a link inside.
 */
export function AvatarMenu() {
  const { user, logout } = useAuth();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-panini-yellow"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('menu.open_aria')}
      >
        <Avatar name={user.name} color="#7B4B9E" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 card !rounded-xl p-2 z-50 shadow-[0_4px_0_0_#1A1A1A]"
        >
          <div className="px-3 py-2 border-b-2 border-panini-ink/10">
            <div className="font-bold truncate">{user.name}</div>
            <div className="font-mono text-[11px] opacity-60 truncate">{user.email}</div>
          </div>
          <nav className="mt-1 flex flex-col">
            <Link
              to="/legal/terms"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-panini-cream font-semibold text-sm flex items-center gap-2"
            >
              <span aria-hidden="true">📜</span>
              <span>{t('menu.terms')}</span>
            </Link>
            <Link
              to="/legal/privacy"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-panini-cream font-semibold text-sm flex items-center gap-2"
            >
              <span aria-hidden="true">🔒</span>
              <span>{t('menu.privacy')}</span>
            </Link>
            <div className="h-px bg-panini-ink/10 my-1" />
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="px-3 py-2 rounded-lg hover:bg-panini-cream font-semibold text-sm text-left text-panini-red flex items-center gap-2"
            >
              <span aria-hidden="true">↩︎</span>
              <span>{t('auth.sign_out')}</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
