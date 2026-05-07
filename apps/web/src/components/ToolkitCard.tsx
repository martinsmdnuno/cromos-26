import { useT } from '../i18n/LangContext';

const WC26_URL = 'https://martinsmdnuno.github.io/wc26/';

/**
 * "Your World Cup 2026 toolkit" — a 2-column landing card that frames cromos AND
 * wc26 as a complementary set, shown above the auth form on the unauthenticated
 * landing page. The Cromos column is decorative (you're already here); the wc26
 * column is an outbound link.
 *
 * Visual: two stacked colored panels with a black divider, each with a category
 * flag-stripe, Anton title, and a subline. Same look as a Group hero shrunk down.
 */
export function ToolkitCard() {
  const { t } = useT();
  return (
    <section className="card overflow-hidden mb-6" aria-label={t('cross.toolkit_label')}>
      <header className="bg-panini-yellow border-b-2 border-panini-ink px-3 py-1.5">
        <div className="label-mono">{t('cross.toolkit_label')}</div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-panini-ink">
        {/* Cromos panel — current app, "you are here" */}
        <div className="bg-panini-red text-white p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-panini-yellow opacity-30" />
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span
                className="font-display leading-none"
                style={{ fontSize: 36, letterSpacing: '-2px' }}
              >
                26
              </span>
              <span className="label-mono opacity-80">CROMOS</span>
            </div>
            <h3 className="font-display text-lg mt-1">{t('cross.cromos_title')}</h3>
            <p className="text-[12px] opacity-90 leading-snug">{t('cross.cromos_sub')}</p>
          </div>
        </div>

        {/* wc26 panel — sister app, outbound link */}
        <a
          href={WC26_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-panini-blue text-white p-4 relative overflow-hidden hover:brightness-110 transition"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-panini-yellow opacity-30" />
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span
                className="font-display leading-none"
                style={{ fontSize: 36, letterSpacing: '-2px' }}
              >
                wc26
              </span>
              <span className="label-mono opacity-80">PWA</span>
            </div>
            <h3 className="font-display text-lg mt-1">{t('cross.wc26_title')}</h3>
            <p className="text-[12px] opacity-90 leading-snug">{t('cross.wc26_sub')}</p>
            <span className="inline-block mt-2 label-mono opacity-90 underline-offset-2 underline">
              {t('cross.wc26_cta')}
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
