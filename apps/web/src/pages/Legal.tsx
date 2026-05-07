import { Link } from 'react-router-dom';
import { useT } from '../i18n/LangContext';
import type { Lang } from '../i18n/messages';

/**
 * Static Terms of Use and Privacy Policy. Reachable from the avatar menu, the footer,
 * and the onboarding screen. No DB, no analytics, no third parties beyond Google
 * sign-in — so the policies stay short and honest.
 *
 * IMPORTANT: nothing here is legal advice. The wording is based on the EU/UK common
 * sense baseline for hobby apps that handle email + display name + sticker counts.
 */

const LAST_UPDATED = '2026-05-07';
const CONTACT_EMAIL = 'nuno@martinsnuno.com';
const APP_DOMAIN = 'stickers.martinsnuno.com';

interface Section {
  h: string;
  p: string[];
}

const TERMS: Record<Lang, { title: string; intro: string; sections: Section[] }> = {
  en: {
    title: 'Terms of Use',
    intro: `These terms govern your use of Cromos 26, a hobby web app at ${APP_DOMAIN} for tracking the Panini FIFA World Cup 2026™ sticker collection. Cromos 26 is not affiliated with, endorsed by, or sponsored by Panini, FIFA, or any participating association. All trademarks belong to their respective owners.`,
    sections: [
      {
        h: 'Account & eligibility',
        p: [
          'You can sign up with email + password or with Google. You must provide a real email and keep your credentials secure. One person, one account.',
          'You must be at least 13 years old to use Cromos 26. If you are under 13, please ask a parent or legal guardian to use the app on your behalf.',
        ],
      },
      {
        h: 'Acceptable use',
        p: [
          'Use Cromos 26 to track your own collection and trade with friends. Do not use it to spam, harass, or impersonate others. Do not attempt to bypass authentication, scrape data, or interfere with the service.',
          'Group invite codes are intended for private circles. If you share a code publicly, anyone with the link can join.',
        ],
      },
      {
        h: 'Your content',
        p: [
          'You retain ownership of the data you enter (name, sticker counts, groups you create). You grant Cromos 26 the limited right to store and display that data so the app can work for you and the friends you share groups with.',
        ],
      },
      {
        h: 'Service availability',
        p: [
          'Cromos 26 is provided "as is" with no warranty. The service may go down, change, or be discontinued at any time without notice. Make your own backup if your collection data matters to you (the Stats page has a "Copy all" button for missing numbers).',
        ],
      },
      {
        h: 'Account closure',
        p: [
          `You can request account deletion at any time by emailing ${CONTACT_EMAIL}. We will delete your profile, your collection, and your group memberships within 30 days.`,
        ],
      },
      {
        h: 'Changes',
        p: [
          'These terms may change. Material changes will be announced in-app or by email. Continued use after a change means you accept the new terms.',
        ],
      },
      {
        h: 'Contact',
        p: [`Questions? ${CONTACT_EMAIL}.`],
      },
    ],
  },
  pt: {
    title: 'Termos de Utilização',
    intro: `Estes termos regem a utilização da Cromos 26, uma app web de hobby em ${APP_DOMAIN} para gerir a coleção de cromos Panini FIFA World Cup 2026™. A Cromos 26 não é afiliada, endossada nem patrocinada pela Panini, pela FIFA ou por qualquer associação participante. Todas as marcas pertencem aos respectivos titulares.`,
    sections: [
      {
        h: 'Conta e elegibilidade',
        p: [
          'Podes registar-te com email + palavra-passe ou com a Google. Tens de usar um email real e manter as credenciais seguras. Uma pessoa, uma conta.',
          'Para usares a Cromos 26 tens de ter, no mínimo, 13 anos. Se tens menos de 13, pede a um pai ou encarregado de educação para usar a app em teu nome.',
        ],
      },
      {
        h: 'Utilização aceitável',
        p: [
          'Usa a Cromos 26 para gerires a tua própria coleção e trocares com amigos. Não a uses para spam, assédio ou personificação de outras pessoas. Não tentes contornar a autenticação, fazer scraping ou interferir com o serviço.',
          'Os códigos de convite de grupos são para círculos privados. Se partilhares um código publicamente, qualquer pessoa com o link pode entrar.',
        ],
      },
      {
        h: 'Os teus conteúdos',
        p: [
          'A propriedade dos dados que introduzes (nome, contagens de cromos, grupos criados) é tua. Concedes à Cromos 26 o direito limitado de armazenar e mostrar esses dados para que a app funcione para ti e para os amigos com quem partilhas grupos.',
        ],
      },
      {
        h: 'Disponibilidade do serviço',
        p: [
          'A Cromos 26 é fornecida "como está", sem qualquer garantia. O serviço pode ficar offline, mudar ou ser descontinuado a qualquer momento sem aviso. Faz cópia dos teus dados se forem importantes para ti (a página de Estatísticas tem um botão "Copiar tudo" para os números em falta).',
        ],
      },
      {
        h: 'Encerramento de conta',
        p: [
          `Podes pedir a eliminação da tua conta a qualquer momento, enviando email para ${CONTACT_EMAIL}. O perfil, a coleção e as participações em grupos são apagados num prazo de 30 dias.`,
        ],
      },
      {
        h: 'Alterações',
        p: [
          'Estes termos podem mudar. Alterações materiais são anunciadas dentro da app ou por email. A continuação da utilização após uma alteração significa que aceitas os novos termos.',
        ],
      },
      {
        h: 'Contacto',
        p: [`Dúvidas? ${CONTACT_EMAIL}.`],
      },
    ],
  },
};

const PRIVACY: Record<Lang, { title: string; intro: string; sections: Section[] }> = {
  en: {
    title: 'Privacy Policy',
    intro: `This page explains what Cromos 26 stores about you, why, and how to get rid of it. We try to keep this short and concrete — Cromos 26 is a personal hobby project, not an ad-funded business.`,
    sections: [
      {
        h: 'What we store',
        p: [
          'Account: your name, email address, and (if you signed in with Google) your Google profile picture URL. If you signed up with a password, only its bcrypt hash is stored — never the password itself.',
          'Collection: the integer count for each of the 980 stickers you mark as owned, missing, or duplicated.',
          'Groups: the groups you create or join, including the group name and the 6-character invite code, and which members you share them with.',
          'Operational logs: the API keeps short-lived logs (HTTP method, path, response code, request id) to debug issues. These are not used for analytics.',
        ],
      },
      {
        h: 'What we do NOT do',
        p: [
          'No third-party analytics (no Google Analytics, no Plausible, no Sentry).',
          'No advertising, no ad trackers, no fingerprinting.',
          'No selling or sharing of your data with third parties.',
          'No marketing emails. We will only ever email you to reply to a message you sent us, or in the rare case of a security incident.',
        ],
      },
      {
        h: 'Cookies',
        p: [
          'One first-party cookie holds your authentication session (signed JWT, httpOnly, SameSite=Lax). It expires after 30 days of inactivity. No third-party cookies are set.',
        ],
      },
      {
        h: 'Where the data lives',
        p: [
          'Everything is stored in a single Postgres database hosted in Helsinki, Finland (Hetzner Cloud, EU). Daily encrypted backups are kept on the same server for 14 days.',
        ],
      },
      {
        h: 'Google Sign-In',
        p: [
          'If you choose Google sign-in, we receive your verified email, your name, your Google account ID, and your profile picture URL — nothing else. We do NOT request access to your contacts, calendar, or any Google Drive content.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          `Access, correction, export, and deletion: email ${CONTACT_EMAIL}. We respond within 30 days.`,
          'You can revoke Google sign-in access at any time from your Google Account → Security → Third-party access.',
        ],
      },
      {
        h: 'Data retention',
        p: [
          'We keep your data while your account is active. After deletion, it is purged from the live database within 30 days, and from backups within 14 additional days as backups roll off.',
        ],
      },
      {
        h: 'Children',
        p: [
          'Cromos 26 is not intended for users under 13. If you believe a child under 13 has created an account, contact us and we will remove it.',
        ],
      },
      {
        h: 'Changes',
        p: [
          'If we make material changes to this policy, we will announce them in-app and via email before they take effect.',
        ],
      },
      {
        h: 'Contact',
        p: [
          `Data controller: Nuno Martins. Email: ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  pt: {
    title: 'Política de Privacidade',
    intro: `Esta página explica o que a Cromos 26 guarda sobre ti, porquê e como te podes ver livre disso. Tentamos manter isto curto e concreto — a Cromos 26 é um projecto pessoal de hobby, não um negócio assente em publicidade.`,
    sections: [
      {
        h: 'O que guardamos',
        p: [
          'Conta: o teu nome, email e (se entraste com Google) o URL da imagem de perfil Google. Se te registaste com palavra-passe, só guardamos o hash bcrypt — nunca a palavra-passe em claro.',
          'Coleção: a contagem inteira de cada um dos 980 cromos que marcas como tens, em falta ou repetido.',
          'Grupos: os grupos que crias ou em que entras, incluindo o nome do grupo, o código de convite de 6 caracteres e os membros com quem partilhas.',
          'Logs operacionais: a API mantém logs curtos (método HTTP, rota, código de resposta, request id) para debugging. Não são usados para analytics.',
        ],
      },
      {
        h: 'O que NÃO fazemos',
        p: [
          'Sem analytics de terceiros (sem Google Analytics, sem Plausible, sem Sentry).',
          'Sem publicidade, sem trackers, sem fingerprinting.',
          'Não vendemos nem partilhamos os teus dados com terceiros.',
          'Sem emails de marketing. Só te enviamos email se for em resposta a uma mensagem tua, ou no caso raro de um incidente de segurança.',
        ],
      },
      {
        h: 'Cookies',
        p: [
          'Um único cookie first-party guarda a sessão de autenticação (JWT assinado, httpOnly, SameSite=Lax). Expira após 30 dias de inactividade. Não há cookies de terceiros.',
        ],
      },
      {
        h: 'Onde os dados ficam',
        p: [
          'Tudo é guardado numa única base de dados Postgres alojada em Helsínquia, Finlândia (Hetzner Cloud, UE). Os backups diários são encriptados, guardados no mesmo servidor durante 14 dias.',
        ],
      },
      {
        h: 'Início de sessão com Google',
        p: [
          'Se optares por Google sign-in, recebemos o teu email verificado, o teu nome, o ID da conta Google e o URL da imagem de perfil — mais nada. NÃO pedimos acesso aos teus contactos, calendário ou Google Drive.',
        ],
      },
      {
        h: 'Os teus direitos',
        p: [
          `Acesso, correcção, exportação e eliminação: envia email para ${CONTACT_EMAIL}. Respondemos em 30 dias.`,
          'Podes revogar o acesso da Cromos 26 à tua conta Google em qualquer altura: Conta Google → Segurança → Acessos de terceiros.',
        ],
      },
      {
        h: 'Retenção de dados',
        p: [
          'Mantemos os dados enquanto a conta estiver activa. Após eliminação, são removidos da base de dados em 30 dias e dos backups em mais 14 dias à medida que estes vão saindo da rotação.',
        ],
      },
      {
        h: 'Crianças',
        p: [
          'A Cromos 26 não se destina a utilizadores com menos de 13 anos. Se souberes de uma conta de menor de 13 anos, avisa-nos e removemo-la.',
        ],
      },
      {
        h: 'Alterações',
        p: [
          'Alterações materiais a esta política são anunciadas dentro da app e por email antes de entrarem em vigor.',
        ],
      },
      {
        h: 'Contacto',
        p: [
          `Responsável pelo tratamento de dados: Nuno Martins. Email: ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
};

interface Props {
  kind: 'terms' | 'privacy';
}

export function Legal({ kind }: Props) {
  const { lang, t } = useT();
  const doc = (kind === 'terms' ? TERMS : PRIVACY)[lang];

  return (
    <div className="px-5 pt-3 pb-10 max-w-prose mx-auto">
      <Link to="/collection" className="label-mono opacity-60 hover:opacity-100">
        ← {t('tab.collection')}
      </Link>
      <h1 className="font-display text-3xl tracking-wide uppercase mt-2">{doc.title}</h1>
      <p className="label-mono opacity-60 mt-1">
        {t('legal.last_updated', { date: LAST_UPDATED })}
      </p>

      <p className="mt-4 text-[15px] leading-relaxed">{doc.intro}</p>

      <div className="mt-6 space-y-5">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-lg tracking-wide uppercase">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="mt-2 text-[15px] leading-relaxed">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="label-mono opacity-50 mt-8">{t('legal.disclaimer')}</p>
    </div>
  );
}
