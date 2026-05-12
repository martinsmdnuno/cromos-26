import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

type Range = '7d' | '30d' | '90d';

interface Overview {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  totalEvents: number;
  totalFeedback: number;
  generatedAt: string;
}

interface PageRow {
  path: string;
  count: number;
}
interface EventRow {
  name: string;
  count: number;
}
interface UserRow {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  method: 'email' | 'google' | 'both';
  createdAt: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export function Admin() {
  const { user, loading } = useAuth();
  const [range, setRange] = useState<Range>('7d');

  const overviewQ = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<Overview>('/api/admin/overview'),
    enabled: !!user?.isAdmin,
  });
  const pagesQ = useQuery({
    queryKey: ['admin', 'pages', range],
    queryFn: () => api.get<{ pages: PageRow[] }>(`/api/admin/pages?range=${range}`),
    enabled: !!user?.isAdmin,
  });
  const eventsQ = useQuery({
    queryKey: ['admin', 'events', range],
    queryFn: () => api.get<{ events: EventRow[] }>(`/api/admin/events?range=${range}`),
    enabled: !!user?.isAdmin,
  });
  const usersQ = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: UserRow[] }>('/api/admin/users'),
    enabled: !!user?.isAdmin,
  });

  if (loading) return null;
  if (!user?.isAdmin) return <Navigate to="/collection" replace />;

  const o = overviewQ.data;

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">ADMIN</h1>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`pill !py-1 !text-xs ${range === r ? 'pill-active' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Stat label="USERS" value={o?.totalUsers} />
        <Stat label="DAU" value={o?.dau} />
        <Stat label="WAU" value={o?.wau} />
        <Stat label="MAU" value={o?.mau} />
        <Stat label="EVENTS · 7D" value={o?.totalEvents} />
        <Stat label="FEEDBACK" value={o?.totalFeedback} />
      </section>

      {/* Pages */}
      <section className="card p-4">
        <h2 className="font-display text-lg mb-2">PAGE VIEWS · {range.toUpperCase()}</h2>
        <Table
          loading={pagesQ.isLoading}
          rows={pagesQ.data?.pages ?? []}
          emptyText="No page views yet."
          columns={[
            { header: 'PATH', cell: (r) => <span className="font-mono">{r.path}</span> },
            { header: 'VIEWS', cell: (r) => r.count, align: 'right' },
          ]}
        />
      </section>

      {/* Events */}
      <section className="card p-4">
        <h2 className="font-display text-lg mb-2">EVENTS · {range.toUpperCase()}</h2>
        <Table
          loading={eventsQ.isLoading}
          rows={eventsQ.data?.events ?? []}
          emptyText="No non-pageview events yet."
          columns={[
            { header: 'NAME', cell: (r) => <span className="font-mono">{r.name}</span> },
            { header: 'COUNT', cell: (r) => r.count, align: 'right' },
          ]}
        />
      </section>

      {/* Users */}
      <section className="card p-4">
        <h2 className="font-display text-lg mb-2">RECENT USERS</h2>
        <Table
          loading={usersQ.isLoading}
          rows={usersQ.data?.users ?? []}
          emptyText="No users yet."
          columns={[
            {
              header: 'NAME',
              cell: (r) => (
                <span>
                  {r.name}
                  {r.isAdmin && (
                    <span className="ml-1 label-mono text-[9px] text-panini-red">ADMIN</span>
                  )}
                </span>
              ),
            },
            { header: 'EMAIL', cell: (r) => <span className="font-mono text-xs">{r.email}</span> },
            {
              header: 'METHOD',
              cell: (r) => <span className="font-mono uppercase text-[10px]">{r.method}</span>,
            },
            {
              header: 'JOINED',
              cell: (r) => <span className="font-mono text-xs">{fmtDate(r.createdAt)}</span>,
            },
          ]}
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="card p-3">
      <div className="label-mono opacity-60">{label}</div>
      <div className="num-display text-3xl mt-1">{value ?? '—'}</div>
    </div>
  );
}

interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

function Table<T>({
  rows,
  columns,
  loading,
  emptyText,
}: {
  rows: T[];
  columns: Column<T>[];
  loading: boolean;
  emptyText: string;
}) {
  if (loading) return <p className="label-mono opacity-60">Loading…</p>;
  if (rows.length === 0) return <p className="label-mono opacity-60">{emptyText}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-panini-ink/15">
            {columns.map((c) => (
              <th
                key={c.header}
                className={`label-mono opacity-70 py-1.5 ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-panini-ink/5">
              {columns.map((c, j) => (
                <td
                  key={j}
                  className={`py-1.5 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
