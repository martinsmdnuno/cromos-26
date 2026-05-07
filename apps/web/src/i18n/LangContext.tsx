import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DICTS, type Lang } from './messages';

const STORAGE_KEY = 'cromos.lang';

function detectInitial(): Lang {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === 'en' || stored === 'pt') return stored;
    const nav = window.navigator.language?.toLowerCase() ?? '';
    if (nav.startsWith('pt')) return 'pt';
  }
  return 'en';
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitial());

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // private mode etc.
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[lang];
      let s = dict[key];
      if (s == null) {
        // Fallback to English so missing translations are obvious in the UI without crashing.
        s = DICTS.en[key] ?? key;
      }
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo<LangContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useT outside LangProvider');
  return ctx;
}
