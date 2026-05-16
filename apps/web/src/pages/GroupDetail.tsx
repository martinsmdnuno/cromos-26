import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stickerLabel, type TradeSuggestion } from '@cromos/shared';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/LangContext';

interface MemberView {
  userId: string;
  name: string;
  color: string;
  owned: number;
  duplicates: number;
  total: number;
  completionPct: number;
}

interface GroupDetail {
  group: {
    id: string;
    name: string;
    code: string;
    createdById: string;
  };
  members: MemberView[];
}

export function GroupDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useT();
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.get<GroupDetail>(`/api/groups/${id}`),
    refetchInterval: 15_000,
    enabled: !!id,
  });
  const tradesQ = useQuery({
    queryKey: ['group', id, 'trades'],
    queryFn: () => api.get<{ suggestions: TradeSuggestion[] }>(`/api/trades/optimize?groupId=${id}`),
    refetchInterval: 15_000,
    enabled: !!id,
  });

  const leave = useMutation({
    mutationFn: () => api.post(`/api/groups/${id}/leave`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      nav('/groups');
    },
  });
  const del = useMutation({
    mutationFn: () => api.del(`/api/groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      nav('/groups');
    },
  });

  const detail = detailQ.data;
  const isCreator = detail && user && detail.group.createdById === user.id;
  const sortedMembers = useMemo(
    () =>
      [...(detail?.members ?? [])].sort((a, b) => b.completionPct - a.completionPct),
    [detail?.members],
  );

  if (!id) return null;
  if (detailQ.isLoading)
    return <div className="px-5 mt-3 label-mono opacity-50">{t('groups.loading')}</div>;
  if (!detail) return <div className="px-5 mt-3">{t('modal.error.group_not_found')}</div>;

  const suggestions = tradesQ.data?.suggestions ?? [];

  return (
    <div>
      {/* Hero with quilt shapes — matches mockup 04 exactly */}
      <div
        className="relative overflow-hidden border-b-3 border-panini-ink text-white"
        style={{ background: '#2E6FB8', padding: '16px 20px 18px' }}
      >
        <div
          className="absolute -right-8 -top-8 w-36 h-36 rounded-full"
          style={{ background: '#F4C430', opacity: 0.4 }}
        />
        <div
          className="absolute right-10 -bottom-10 w-20 h-20 rounded-full"
          style={{ background: '#E63027', opacity: 0.5 }}
        />
        <div className="relative z-10">
          <Link to="/groups" className="font-mono text-xs">
            {t('group.back')}
          </Link>
          <h1 className="font-display text-4xl leading-none tracking-wide mt-2 uppercase">
            {detail.group.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 font-mono text-xs flex-wrap">
            <span>
              {detail.members.length === 1
                ? t('groups.member_count_one')
                : t('groups.member_count_other', { n: detail.members.length })}
            </span>
            <CodePill code={detail.group.code} />
            <ShareButton code={detail.group.code} groupName={detail.group.name} />
          </div>
        </div>
      </div>

      <div className="px-5">
        {/* Leaderboard */}
        <div className="flex items-center gap-2.5 pt-4 pb-2.5">
          <div className="w-1.5 h-5 rounded-sm bg-panini-purple" />
          <h2 className="font-display text-lg tracking-wide">{t('group.leaderboard')}</h2>
        </div>
        <ul className="space-y-2">
          {sortedMembers.map((m) => {
            const isMe = user?.id === m.userId;
            return (
              <li
                key={m.userId}
                className={`card p-2.5 flex items-center gap-2.5 ${
                  isMe ? 'border-3 border-panini-red' : ''
                }`}
              >
                <Avatar name={m.name} color={m.color} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span className="truncate">{m.name}</span>
                    {isMe && (
                      <span className="bg-panini-red text-white text-[8px] px-1.5 py-0.5 rounded font-mono tracking-widest">
                        {t('group.you_tag')}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-panini-cream border border-panini-ink rounded mt-1 overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${m.completionPct}%`, background: m.color }}
                    />
                  </div>
                  <div className="label-mono opacity-70 mt-0.5">
                    {t('group.owned_dups', { owned: m.owned, dups: m.duplicates })}
                  </div>
                </div>
                <div className="font-display text-2xl leading-none">{Math.round(m.completionPct)}%</div>
              </li>
            );
          })}
        </ul>

        {/* Trade suggestions */}
        <div className="flex items-center gap-2.5 pt-5 pb-2.5">
          <div className="w-1.5 h-5 rounded-sm bg-panini-red" />
          <h2 className="font-display text-lg tracking-wide">{t('group.trade_suggestions')}</h2>
        </div>

        {suggestions.length === 0 && <p className="text-sm opacity-60 mb-4">{t('group.no_trades')}</p>}

        <ul className="space-y-2.5">
          {suggestions.slice(0, 20).map((s, i) => (
            <li key={i}>
              <TradeCard trade={s} />
            </li>
          ))}
        </ul>

        {/* Footer actions */}
        <div className="mt-8 mb-4 flex gap-2">
          <button
            className="pill flex-1"
            onClick={() => {
              if (confirm(t('group.confirm_leave'))) leave.mutate();
            }}
          >
            {t('group.leave')}
          </button>
          {isCreator && (
            <button
              className="pill flex-1 !border-panini-red text-panini-red"
              onClick={() => {
                if (confirm(t('group.confirm_delete'))) del.mutate();
              }}
            >
              {t('group.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CodePill({ code }: { code: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="font-mono font-bold tracking-[0.2em] border-2 border-dashed border-white/80 rounded-pill px-2.5 py-0.5 hover:bg-white/10"
      aria-label={t('group.copy_code_aria', { code })}
    >
      {copied ? t('group.copied') : code}
    </button>
  );
}

/**
 * Native share sheet for the group invite. Uses the Web Share API on mobile
 * (iOS Safari and Android Chrome both supported) so the user can pick
 * WhatsApp / Messages / Mail in one tap. Falls back to copying the join URL
 * on desktop browsers that don't implement `navigator.share`.
 *
 * The shared URL points at `/join/:code`, which auto-opens the join modal
 * pre-filled — so the receiver only needs one tap to confirm.
 */
function ShareButton({ code, groupName }: { code: string; groupName: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const url = `${window.location.origin}/join/${code}`;
    const text = t('group.share_text', { name: groupName, code });
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('group.share_title'), text, url });
        return;
      } catch (e) {
        // User cancelled — do nothing. Anything else falls through to copy.
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={onClick}
      className="font-mono font-bold uppercase tracking-wide border-2 border-white/80 rounded-pill px-2.5 py-0.5 bg-white text-panini-ink hover:bg-panini-cream flex items-center gap-1"
      aria-label={t('group.share_aria', { code })}
    >
      <span aria-hidden="true">↗</span>
      <span>{copied ? t('group.share_copied') : t('group.share')}</span>
    </button>
  );
}

function TradeCard({ trade }: { trade: TradeSuggestion }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const limit = 4;
  const aVisible = expanded ? trade.aGives : trade.aGives.slice(0, limit);
  const aRest = trade.aGives.length - aVisible.length;
  const bVisible = expanded ? trade.bGives : trade.bGives.slice(0, limit);
  const bRest = trade.bGives.length - bVisible.length;
  const canCollapse = expanded && (trade.aGives.length > limit || trade.bGives.length > limit);

  return (
    <article
      className={`card overflow-hidden ${trade.involvesMe ? 'border-3 border-panini-red' : ''}`}
    >
      <header className="bg-panini-yellow border-b-2 border-panini-ink px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>{trade.aName}</span>
          <span className="text-panini-red text-base">↔</span>
          <span>{trade.bName}</span>
        </div>
        <span className="bg-panini-ink text-panini-yellow font-mono text-[11px] font-bold px-2 py-0.5 rounded-pill tracking-widest">
          {t('group.trade_each', { n: trade.count })}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-px bg-panini-ink">
        <TradeSide
          title={`${trade.aName.toUpperCase()} ${t('group.gives')}`}
          numbers={aVisible}
          extra={aRest}
          showCollapse={canCollapse}
          variant="give"
          onExpand={() => setExpanded(true)}
          onCollapse={() => setExpanded(false)}
          totalCount={trade.aGives.length}
          t={t}
        />
        <TradeSide
          title={`${trade.bName.toUpperCase()} ${t('group.gives')}`}
          numbers={bVisible}
          extra={bRest}
          showCollapse={canCollapse}
          variant="get"
          onExpand={() => setExpanded(true)}
          onCollapse={() => setExpanded(false)}
          totalCount={trade.bGives.length}
          t={t}
        />
      </div>
    </article>
  );
}

function TradeSide({
  title,
  numbers,
  extra,
  showCollapse,
  variant,
  onExpand,
  onCollapse,
  totalCount,
  t,
}: {
  title: string;
  numbers: number[];
  extra: number;
  showCollapse: boolean;
  variant: 'give' | 'get';
  onExpand: () => void;
  onCollapse: () => void;
  totalCount: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const bg = variant === 'give' ? '#6FBE44' : '#2FB8AB';
  const chipBase =
    'font-mono text-[10px] font-bold border border-panini-ink rounded px-1.5 py-0.5';
  return (
    <div className="bg-white px-2.5 py-2">
      <div className="label-mono opacity-60">{title}</div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {numbers.map((n) => (
          <span
            key={n}
            className={chipBase}
            style={{ background: bg, color: '#1A1A1A' }}
          >
            {stickerLabel(n)}
          </span>
        ))}
        {extra > 0 && (
          <button
            type="button"
            onClick={onExpand}
            className={`${chipBase} cursor-pointer hover:brightness-95 active:brightness-90`}
            style={{ background: bg, color: '#1A1A1A' }}
            aria-label={t('group.show_all_aria', { n: totalCount })}
          >
            +{extra}
          </button>
        )}
        {showCollapse && extra === 0 && (
          <button
            type="button"
            onClick={onCollapse}
            className={`${chipBase} cursor-pointer hover:brightness-95 active:brightness-90`}
            style={{ background: bg, color: '#1A1A1A' }}
            aria-label={t('group.show_less_aria')}
          >
            −
          </button>
        )}
      </div>
    </div>
  );
}

