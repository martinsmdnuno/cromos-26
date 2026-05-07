import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type TradeSuggestion } from '@cromos/shared';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';

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
  if (detailQ.isLoading) return <div className="px-5 mt-3 label-mono opacity-50">Loading…</div>;
  if (!detail) return <div className="px-5 mt-3">Group not found</div>;

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
            ← Groups
          </Link>
          <h1 className="font-display text-4xl leading-none tracking-wide mt-2 uppercase">
            {detail.group.name}
          </h1>
          <div className="mt-2 flex items-center gap-3 font-mono text-xs">
            <span>
              {detail.members.length} member{detail.members.length === 1 ? '' : 's'}
            </span>
            <CodePill code={detail.group.code} />
          </div>
        </div>
      </div>

      <div className="px-5">
        {/* Leaderboard */}
        <div className="flex items-center gap-2.5 pt-4 pb-2.5">
          <div className="w-1.5 h-5 rounded-sm bg-panini-purple" />
          <h2 className="font-display text-lg tracking-wide">LEADERBOARD</h2>
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
                        YOU
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
                    {m.owned} owned · {m.duplicates} dups
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
          <h2 className="font-display text-lg tracking-wide">TRADE SUGGESTIONS</h2>
        </div>

        {suggestions.length === 0 && (
          <p className="text-sm opacity-60 mb-4">
            No balanced trades yet — get more duplicates and check back!
          </p>
        )}

        <ul className="space-y-2.5">
          {suggestions.slice(0, 20).map((t, i) => (
            <li key={i}>
              <TradeCard t={t} />
            </li>
          ))}
        </ul>

        {/* Footer actions */}
        <div className="mt-8 mb-4 flex gap-2">
          <button
            className="pill flex-1"
            onClick={() => {
              if (confirm('Leave this group?')) leave.mutate();
            }}
          >
            Leave group
          </button>
          {isCreator && (
            <button
              className="pill flex-1 !border-panini-red text-panini-red"
              onClick={() => {
                if (confirm('Delete this group for everyone? This cannot be undone.')) del.mutate();
              }}
            >
              Delete group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CodePill({ code }: { code: string }) {
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
      aria-label={`Invite code ${code}, click to copy`}
    >
      {copied ? 'COPIED!' : code}
    </button>
  );
}

function TradeCard({ t }: { t: TradeSuggestion }) {
  const limit = 4;
  const aPreview = t.aGives.slice(0, limit);
  const aRest = t.aGives.length - aPreview.length;
  const bPreview = t.bGives.slice(0, limit);
  const bRest = t.bGives.length - bPreview.length;

  return (
    <article
      className={`card overflow-hidden ${t.involvesMe ? 'border-3 border-panini-red' : ''}`}
    >
      <header
        className="bg-panini-yellow border-b-2 border-panini-ink px-3 py-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>{t.aName}</span>
          <span className="text-panini-red text-base">↔</span>
          <span>{t.bName}</span>
        </div>
        <span className="bg-panini-ink text-panini-yellow font-mono text-[11px] font-bold px-2 py-0.5 rounded-pill tracking-widest">
          {t.count} EACH
        </span>
      </header>
      <div className="grid grid-cols-2 gap-px bg-panini-ink">
        <TradeSide title={`${t.aName.toUpperCase()} GIVES`} numbers={aPreview} extra={aRest} variant="give" />
        <TradeSide title={`${t.bName.toUpperCase()} GIVES`} numbers={bPreview} extra={bRest} variant="get" />
      </div>
    </article>
  );
}

function TradeSide({
  title,
  numbers,
  extra,
  variant,
}: {
  title: string;
  numbers: number[];
  extra: number;
  variant: 'give' | 'get';
}) {
  const bg = variant === 'give' ? '#6FBE44' : '#2FB8AB';
  return (
    <div className="bg-white px-2.5 py-2">
      <div className="label-mono opacity-60">{title}</div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {numbers.map((n) => (
          <span
            key={n}
            className="font-mono text-[10px] font-bold border border-panini-ink rounded px-1.5 py-0.5"
            style={{ background: bg, color: '#1A1A1A' }}
          >
            #{n}
          </span>
        ))}
        {extra > 0 && (
          <span
            className="font-mono text-[10px] font-bold border border-panini-ink rounded px-1.5 py-0.5"
            style={{ background: bg, color: '#1A1A1A' }}
          >
            +{extra}
          </span>
        )}
      </div>
    </div>
  );
}

