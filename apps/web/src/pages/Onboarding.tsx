import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Single CTA onboarding. Big "26" hero with quilt shapes, then name + email + password.
 * Toggle between signup and login with one link.
 */
export function Onboarding() {
  const { signup, login } = useAuth();
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
          setErr('Please enter your name');
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
          ? 'Wrong email or password'
          : msg === 'email_taken'
            ? 'That email is already in use'
            : 'Something went wrong — please try again',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-panini-cream flex items-center justify-center p-5">
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
            <div
              className="absolute top-[40px] right-[80px] w-14 h-14"
              style={{ background: '#2E6FB8' }}
            />
          </div>
          <div className="relative z-10">
            <div className="label-mono opacity-70">CROMOS · WORLD CUP 2026</div>
            <h1
              className="num-display"
              style={{ fontSize: 110, lineHeight: 0.85, letterSpacing: '-4px' }}
            >
              <span className="text-panini-red">2</span>
              <span className="text-panini-blue">6</span>
            </h1>
            <p className="mt-3 font-mono text-[12px] font-bold">
              980 STICKERS · 48 TEAMS · ONE ALBUM
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="card p-5 space-y-3">
          <h2 className="font-display text-2xl mb-1">
            {mode === 'signup' ? 'START YOUR ALBUM' : 'WELCOME BACK'}
          </h2>

          {mode === 'signup' && (
            <label className="block">
              <span className="label-mono">NAME</span>
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
            <span className="label-mono">EMAIL</span>
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
            <span className="label-mono">PASSWORD</span>
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
            {busy ? '...' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>

          <button
            type="button"
            className="w-full text-sm font-semibold text-panini-ink/70 hover:text-panini-ink"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup'
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'}
          </button>
        </form>
      </div>
    </div>
  );
}
