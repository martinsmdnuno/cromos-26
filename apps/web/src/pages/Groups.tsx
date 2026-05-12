import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useT } from '../i18n/LangContext';
import { track } from '../hooks/useTrack';

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
  const { t } = useT();
  const navigate = useNavigate();
  // `/join/:code` mounts this page with a code param — auto-open the join
  // modal pre-filled so the deep link from a shared WhatsApp invite is
  // a single tap to confirm.
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const initialJoinCode = codeFromUrl?.trim().toUpperCase().slice(0, 6);

  const groupsQ = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<{ groups: GroupListItem[] }>('/api/groups'),
    refetchInterval: 15_000,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(!!initialJoinCode);

  useEffect(() => {
    if (initialJoinCode) setShowJoin(true);
  }, [initialJoinCode]);

  const create = useMutation({
    mutationFn: (name: string) => api.post('/api/groups', { name }),
    onSuccess: () => {
      track('group.created');
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
  const join = useMutation({
    mutationFn: (code: string) => api.post('/api/groups/join', { code }),
    onSuccess: () => {
      track('group.joined');
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return (
    <div className="px-5 mt-3">
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-1.5 h-6 rounded-sm bg-panini-blue" />
        <h2 className="font-display text-lg tracking-wide">{t('groups.your_groups')}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          className="card p-3 font-bold text-left bg-panini-yellow"
          onClick={() => setShowCreate(true)}
        >
          <div className="font-display text-2xl leading-none">{t('groups.new')}</div>
          <div className="label-mono mt-1 opacity-70">{t('groups.new_sub')}</div>
        </button>
        <button
          className="card p-3 font-bold text-left bg-panini-teal text-panini-ink"
          onClick={() => setShowJoin(true)}
        >
          <div className="font-display text-2xl leading-none">{t('groups.join')}</div>
          <div className="label-mono mt-1 opacity-70">{t('groups.join_sub')}</div>
        </button>
      </div>

      {groupsQ.isLoading && <div className="label-mono opacity-50 mt-4">{t('groups.loading')}</div>}

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
                  {g.memberCount === 1
                    ? t('groups.member_count_one')
                    : t('groups.member_count_other', { n: g.memberCount })}
                  {' · '}
                  {t('groups.code_label', { code: g.code })}
                </div>
              </div>
              <span className="font-mono opacity-60">›</span>
            </Link>
          </li>
        ))}
      </ul>

      {groupsQ.data?.groups.length === 0 && (
        <p className="text-center mt-8 opacity-60 text-sm">{t('groups.empty')}</p>
      )}

      {showCreate && (
        <PromptModal
          title={t('modal.new_group_title')}
          placeholder={t('modal.group_name_placeholder')}
          submitLabel={t('modal.create')}
          onClose={() => setShowCreate(false)}
          onSubmit={async (val) => {
            await create.mutateAsync(val);
            setShowCreate(false);
          }}
        />
      )}
      {showJoin && (
        <PromptModal
          title={t('modal.join_group_title')}
          placeholder={t('modal.code_placeholder')}
          submitLabel={t('modal.join')}
          mono
          initialValue={initialJoinCode}
          onClose={() => {
            setShowJoin(false);
            // If we landed here via /join/:code, clean the URL so a refresh
            // doesn't re-open the modal after a cancel.
            if (codeFromUrl) navigate('/groups', { replace: true });
          }}
          onSubmit={async (val) => {
            await join.mutateAsync(val.trim().toUpperCase());
            setShowJoin(false);
            if (codeFromUrl) navigate('/groups', { replace: true });
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
  initialValue,
  onClose,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  submitLabel: string;
  mono?: boolean;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (val: string) => Promise<void>;
}) {
  const { t } = useT();
  const [val, setVal] = useState(initialValue ?? '');
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
          ? t('modal.error.group_not_found')
          : msg === 'invalid_code'
            ? t('modal.error.invalid_code')
            : t('modal.error.generic'),
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
          <button type="button" onClick={onClose} className="pill flex-1">
            {t('modal.cancel')}
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
