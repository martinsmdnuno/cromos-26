import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { CATEGORIES, categoryForSticker } from '@cromos/shared';
import { useAuth } from '../hooks/useAuth';

interface GroupListItem {
  id: string;
  name: string;
  code: string;
  memberCount: number;
}

interface MemberView {
  userId: string;
  name: string;
  color: string;
}

interface DirectResult {
  iCanGive: number[];
  theyCanGive: number[];
}

/**
 * Direct trades: pick a group → pick a friend → see two lists,
 * grouped by category for readability.
 */
export function Trades() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);

  const groupsQ = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<{ groups: GroupListItem[] }>('/api/groups'),
  });
  const detailQ = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.get<{ members: MemberView[] }>(`/api/groups/${groupId}`),
    enabled: !!groupId,
  });
  const directQ = useQuery({
    queryKey: ['trade', groupId, otherId],
    queryFn: () =>
      api.get<DirectResult>(`/api/trades/direct?groupId=${groupId}&otherId=${otherId}`),
    enabled: !!groupId && !!otherId,
  });

  const others = (detailQ.data?.members ?? []).filter((m) => m.userId !== user?.id);

  return (
    <div className="px-5 mt-3">
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-1.5 h-6 rounded-sm bg-panini-teal" />
        <h2 className="font-display text-lg tracking-wide">DIRECT TRADES</h2>
      </div>

      {/* Group picker */}
      <div className="space-y-2">
        <label className="block label-mono opacity-70">GROUP</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(groupsQ.data?.groups ?? []).map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGroupId(g.id);
                setOtherId(null);
              }}
              className={`pill whitespace-nowrap ${groupId === g.id ? 'pill-active' : ''}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Friend picker */}
      {groupId && (
        <div className="space-y-2 mt-3">
          <label className="block label-mono opacity-70">FRIEND</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {others.map((m) => (
              <button
                key={m.userId}
                onClick={() => setOtherId(m.userId)}
                className={`pill whitespace-nowrap ${otherId === m.userId ? 'pill-active' : ''}`}
              >
                {m.name}
              </button>
            ))}
            {others.length === 0 && (
              <span className="text-sm opacity-60">No other members in this group yet.</span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {groupId && otherId && (
        <div className="mt-5 grid gap-3">
          <ResultPanel
            title="YOU CAN GIVE"
            sub="Your duplicates they're missing"
            numbers={directQ.data?.iCanGive ?? []}
            color="#6FBE44"
          />
          <ResultPanel
            title="THEY CAN GIVE"
            sub="Their duplicates you're missing"
            numbers={directQ.data?.theyCanGive ?? []}
            color="#2FB8AB"
          />
        </div>
      )}

      {!groupId && (
        <p className="text-sm opacity-60 mt-6">
          Pick a group above to see who you can trade with.
        </p>
      )}
    </div>
  );
}

function ResultPanel({
  title,
  sub,
  numbers,
  color,
}: {
  title: string;
  sub: string;
  numbers: number[];
  color: string;
}) {
  const groups = useMemo(() => {
    const out = new Map<string, { name: string; color: string; nums: number[] }>();
    for (const n of numbers) {
      const cat = categoryForSticker(n);
      let g = out.get(cat.id);
      if (!g) {
        const swatch = CATEGORIES.find((c) => c.id === cat.id)?.colorKey;
        g = { name: cat.name, color: swatch ?? 'red', nums: [] };
        out.set(cat.id, g);
      }
      g.nums.push(n);
    }
    return Array.from(out.values());
  }, [numbers]);

  return (
    <section className="card p-3">
      <div className="flex items-baseline gap-2">
        <h3 className="font-display text-lg" style={{ color: '#1A1A1A' }}>
          {title}
        </h3>
        <span className="font-mono text-[10px] opacity-60">{numbers.length} STICKERS</span>
      </div>
      <p className="label-mono opacity-60 mb-2">{sub}</p>
      {numbers.length === 0 && (
        <p className="text-sm opacity-50">Nothing balanced here yet.</p>
      )}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.name}>
            <div className="label-mono opacity-70 mb-1">{g.name}</div>
            <div className="flex flex-wrap gap-1">
              {g.nums.map((n) => (
                <span
                  key={n}
                  className="font-mono text-[10px] font-bold border border-panini-ink rounded px-1.5 py-0.5"
                  style={{ background: color, color: '#1A1A1A' }}
                >
                  #{n}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
