import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n/LangContext';

interface Props {
  onClose: () => void;
}

/**
 * Lightweight feedback form. Free-text message + optional "you can reply to me"
 * checkbox. Submission is best-effort: the API stores it in the DB and, if the
 * server is configured with Resend, forwards it by email. We don't block the
 * UI on the email part — successfully persisting is enough to thank the user.
 */
export function FeedbackModal({ onClose }: Props) {
  const { t } = useT();
  const [message, setMessage] = useState('');
  const [contactOk, setContactOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    taRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && !busy && !sent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setBusy(true);
    try {
      await api.post('/api/feedback', {
        message: trimmed,
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        contactOk,
      });
      setSent(true);
    } catch {
      setErr(t('feedback.error.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('feedback.title')}
      className="fixed inset-0 z-50 bg-panini-ink/40 flex items-end md:items-center justify-center p-3"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="card w-full max-w-md p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{t('feedback.title')}</h2>
          <button
            type="button"
            className="label-mono text-panini-ink/70 hover:text-panini-ink"
            onClick={onClose}
            aria-label={t('sticker.close')}
          >
            {t('sticker.close')}
          </button>
        </div>

        {sent ? (
          <>
            <p className="border-2 border-panini-ink rounded-xl px-3 py-3 bg-panini-yellow font-semibold">
              {t('feedback.thanks')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-panini-ink text-white border-2 border-panini-ink rounded-pill py-3 font-bold"
            >
              {t('feedback.close')}
            </button>
          </>
        ) : (
          <>
            <p className="label-mono opacity-60">{t('feedback.hint')}</p>

            <textarea
              ref={taRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.placeholder')}
              maxLength={2000}
              className="w-full h-32 border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream resize-none focus:outline-none"
            />

            <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={contactOk}
                onChange={(e) => setContactOk(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-panini-red"
              />
              <span>{t('feedback.contact_ok')}</span>
            </label>

            {err && (
              <p className="text-sm text-panini-red font-semibold border-2 border-panini-red rounded-lg px-3 py-2 bg-white">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-panini-red text-white border-2 border-panini-ink rounded-pill py-3 font-bold disabled:opacity-40"
            >
              {busy ? t('feedback.sending') : t('feedback.send')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
