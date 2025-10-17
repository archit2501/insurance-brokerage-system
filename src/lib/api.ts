export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function buildUrl(path: string) {
  // Use same-origin for Next.js internal API routes
  if (path.startsWith('/api/')) return path;
  return `${API_BASE}${path}`;
}

export function authHeader() {
  if (typeof window === 'undefined') return {} as any;
  const t = window.localStorage.getItem('bearer_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), { headers: { 'Content-Type': 'application/json', ...authHeader() } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(buildUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(buildUrl(path), { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(buildUrl(path), { method: 'DELETE', headers: { ...authHeader() } });
  if (!res.ok) throw new Error(await res.text());
}