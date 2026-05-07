import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Trophy } from '../components/Trophy';
import { LangToggle } from '../components/LangToggle';
import { ToolkitCard } from '../components/ToolkitCard';
import { useT } from '../i18n/LangContext';

/**
 * Single CTA onboarding. Big "26" hero with quilt shapes, then name + email + password.
 * Toggle between signup and login with one link. Lang toggle in the corner.
 */
export function Onboarding() {
  const { signup, login } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setErr(t('auth.error.name_required'));
          return;
        }
        await signup(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      nav('/collection');
    } catch (e) {
      const msg = (e as { error?: string }).error;
      setErr(
        msg === 'invalid_credentials'
          ? t('auth.error.bad_credentials')
          : msg === 'email_taken'
            ? t('auth.error.email_taken')
            : t('auth.error.generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-panini-cream flex items-center justify-center p-5 relative">
      <div className="absolute top-4 right-4 z-20">
        <LangToggle />
      </div>
      <div className="w-full max-w-md">
        {/* Hero — "26" with decorative quilt shapes echoing the album cover */}
        <div className="card-hero p-6 mb-6">
          <div className="absolute inset-0 z-0">
            <div
              className="absolute -top-6 -right-6 w-32 h-32 rounded-full"
              style={{ background: '#E63027' }}
            />
            <div
              className="absolute bottom-[-20px] right-[60px] w-20 h-20 rounded-full"
              style={{ background: '#F4C430' }}
            />
            <div className="absolute top-3 right-4 rotate-12 opacity-95">
              <Trophy size={68} color="#F4C430" stroke="#1A1A1A" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="label-mono opacity-70">{t('app.cromos_world_cup_2026')}</div>
            <h1
              className="num-display"
              style={{ fontSize: 110, lineHeight: 0.85, letterSpacing: '-4px' }}
            >
              <span className="text-panini-red">2</span>
              <span className="text-panini-blue">6</span>
            </h1>
            <p className="mt-3 font-mono text-[12px] font-bold">{t('app.tagline')}</p>
          </div>
        </div>

        {/* Cross-sell: Cromos + wc26 framed as one toolkit. Doubles as the public
            landing for unauthenticated visitors who hit stickers.martinsnuno.com. */}
        <ToolkitCard />

        <form onSubmit={submit} className="card p-5 space-y-3">
          <h2 className="font-display text-2xl mb-1">
            {mode === 'signup' ? t('auth.start_your_album') : t('auth.welcome_back')}
          </h2>

          {/* Google sign-in is wired up server-side; safe to render on both modes
              because Google sign-up and sign-in are the same flow. */}
          <a
            href="/api/auth/google/start"
            className="w-full bg-white border-2 border-panini-ink rounded-pill py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-panini-cream"
          >
            <GoogleG />
            <span>{t('auth.continue_with_google')}</span>
          </a>

          <div className="flex items-center gap-2 my-1 text-panini-ink/50 font-mono text-[10px] uppercase tracking-widest">
            <span className="flex-1 h-px bg-panini-ink/20" />
            <span>{t('auth.or')}</span>
            <span className="flex-1 h-px bg-panini-ink/20" />
          </div>

          {mode === 'signup' && (
            <label className="block">
              <span className="label-mono">{t('auth.name')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="block">
            <span className="label-mono">{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="label-mono">{t('auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </label>

          {err && (
            <p className="text-sm text-panini-red font-semibold border-2 border-panini-red rounded-lg px-3 py-2 bg-white">
              {err}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full bg-panini-red text-white border-2 border-panini-ink rounded-pill py-3 font-bold disabled:opacity-60"
          >
            {busy ? '...' : mode === 'signup' ? t('auth.create_account') : t('auth.sign_in')}
          </button>

          <button
            type="button"
            className="w-full text-sm font-semibold text-panini-ink/70 hover:text-panini-ink"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup' ? t('auth.have_account') : t('auth.no_account')}
          </button>

          <p className="text-[11px] text-center opacity-60 leading-snug pt-1">
            {t('legal.consent_lead')}{' '}
            <Link to="/legal/terms" className="underline">
              {t('menu.terms')}
            </Link>{' '}
            {t('legal.and')}{' '}
            <Link to="/legal/privacy" className="underline">
              {t('menu.privacy')}
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}

/** Tiny inline Google "G" mark — the standard 4-color logo. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
