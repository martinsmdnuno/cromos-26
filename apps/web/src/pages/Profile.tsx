import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/LangContext';

export function Profile() {
  const { user, updateProfile } = useAuth();
  const { t } = useT();
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const dirty = name.trim() !== user.name;
  const canSave = dirty && name.trim().length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setErr(t('profile.error.name_required'));
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name: trimmed });
      setSaved(true);
    } catch {
      setErr(t('profile.error.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-2 pb-6">
      <h1 className="font-display text-3xl mb-4">{t('profile.title')}</h1>

      <form onSubmit={submit} className="card p-5 space-y-3 max-w-md">
        <label className="block">
          <span className="label-mono">{t('profile.display_name')}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={60}
            className="mt-1 w-full border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream"
            autoComplete="name"
            required
          />
        </label>

        <label className="block">
          <span className="label-mono">{t('profile.email')}</span>
          <input
            value={user.email}
            readOnly
            disabled
            className="mt-1 w-full border-2 border-panini-ink/40 rounded-xl px-3 py-2 bg-white/60 text-panini-ink/60"
          />
          <span className="mt-1 block label-mono text-[10px] opacity-50">
            {t('profile.email_readonly_hint')}
          </span>
        </label>

        {err && (
          <p className="text-sm text-panini-red font-semibold border-2 border-panini-red rounded-lg px-3 py-2 bg-white">
            {err}
          </p>
        )}

        {saved && !dirty && (
          <p className="text-sm font-semibold border-2 border-panini-ink rounded-lg px-3 py-2 bg-panini-yellow">
            {t('profile.saved')}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="w-full bg-panini-red text-white border-2 border-panini-ink rounded-pill py-3 font-bold disabled:opacity-40"
        >
          {busy ? t('profile.saving') : t('profile.save')}
        </button>
      </form>
    </div>
  );
}
