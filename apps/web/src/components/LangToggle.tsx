import { useT } from '../i18n/LangContext';
import { LANG_FLAGS, LANG_LABELS, type Lang } from '../i18n/messages';

/**
 * Tiny pill toggle in the header. Two-state since we only ship EN + PT — clicking
 * cycles between them. If we ever add more languages, swap to a popover/select.
 */
export function LangToggle() {
  const { lang, setLang } = useT();
  const next: Lang = lang === 'pt' ? 'en' : 'pt';
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className="pill !py-1 !px-2 text-[12px] flex items-center gap-1"
      aria-label={`Switch to ${LANG_LABELS[next]}`}
      title={LANG_LABELS[next]}
    >
      <span aria-hidden="true">{LANG_FLAGS[lang]}</span>
      <span className="font-mono uppercase tracking-wider">{lang}</span>
    </button>
  );
}
