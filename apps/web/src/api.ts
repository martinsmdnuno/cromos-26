// Thin API client — same-origin in production (Caddy reverse-proxies /api),
// proxied via Vite dev server in development.

const BASE = ''; // empty = same origin

export type ApiError = { error: string; status: number };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const err: ApiError = { error: body.error ?? `http_${res.status}`, status: res.status };
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
};
