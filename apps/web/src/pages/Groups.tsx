import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

interface GroupListItem {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  createdById: string;
  myColor: string;
}

export function Groups() {
  const qc = useQueryClient();
  const groupsQ = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<{ groups: GroupListItem[] }>('/api/groups'),
    refetchInterval: 15_000,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const create = useMutation({
    mutationFn: (name: string) => api.post('/api/groups', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
  const join = useMutation({
    mutationFn: (code: string) => api.post('/api/groups/join', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  return (
    <div className="px-5 mt-3">
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-1.5 h-6 rounded-sm bg-panini-blue" />
        <h2 className="font-display text-lg tracking-wide">YOUR GROUPS</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          className="card p-3 font-bold text-left bg-panini-yellow"
          onClick={() => setShowCreate(true)}
        >
          <div className="font-display text-2xl leading-none">+ NEW</div>
          <div className="label-mono mt-1 opacity-70">Create a group</div>
        </button>
        <button
          className="card p-3 font-bold text-left bg-panini-teal text-panini-ink"
          onClick={() => setShowJoin(true)}
        >
          <div className="font-display text-2xl leading-none">JOIN</div>
          <div className="label-mono mt-1 opacity-70">Use invite code</div>
        </button>
      </div>

      {groupsQ.isLoading && <div className="label-mono opacity-50 mt-4">Loading…</div>}

      <ul className="space-y-2">
        {(groupsQ.data?.groups ?? []).map((g) => (
          <li key={g.id}>
            <Link
              to={`/groups/${g.id}`}
              className="card p-3 flex items-center gap-3 hover:bg-panini-cream transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg border-2 border-panini-ink flex items-center justify-center font-display text-xl"
                style={{ background: g.myColor, color: '#fff' }}
              >
                {g.name[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{g.name}</div>
                <div className="label-mono opacity-60">
                  {g.memberCount} member{g.memberCount === 1 ? '' : 's'} · CODE {g.code}
                </div>
              </div>
              <span className="font-mono opacity-60">›</span>
            </Link>
          </li>
        ))}
      </ul>

      {groupsQ.data?.groups.length === 0 && (
        <p className="text-center mt-8 opacity-60 text-sm">
          No groups yet. Create one or join with a friend's invite code.
        </p>
      )}

      {showCreate && (
        <PromptModal
          title="NEW GROUP"
          placeholder="Group name (e.g. Café Friends)"
          submitLabel="CREATE"
          onClose={() => setShowCreate(false)}
          onSubmit={async (val) => {
            await create.mutateAsync(val);
            setShowCreate(false);
          }}
        />
      )}
      {showJoin && (
        <PromptModal
          title="JOIN A GROUP"
          placeholder="6-CHAR CODE"
          submitLabel="JOIN"
          mono
          onClose={() => setShowJoin(false)}
          onSubmit={async (val) => {
            await join.mutateAsync(val.trim().toUpperCase());
            setShowJoin(false);
          }}
        />
      )}
    </div>
  );
}

function PromptModal({
  title,
  placeholder,
  submitLabel,
  mono,
  onClose,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  submitLabel: string;
  mono?: boolean;
  onClose: () => void;
  onSubmit: (val: string) => Promise<void>;
}) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(val);
    } catch (e) {
      const msg = (e as { error?: string }).error;
      setErr(
        msg === 'group_not_found'
          ? 'No group with that code'
          : msg === 'invalid_code'
            ? 'Codes are 6 letters/numbers'
            : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="card w-full max-w-sm p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl">{title}</h2>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className={`w-full border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream ${
            mono ? 'font-mono uppercase tracking-[0.3em] text-center text-lg' : ''
          }`}
          maxLength={mono ? 6 : 60}
        />
        {err && <p className="text-sm text-panini-red font-semibold">{err}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pill flex-1"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="flex-1 bg-panini-ink text-white rounded-pill border-2 border-panini-ink py-2 font-bold disabled:opacity-60"
          >
            {busy ? '…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
