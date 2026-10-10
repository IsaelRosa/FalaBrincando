// Cliente HTTP com autenticação (JWT) e tratamento de erro amigável.

const TOKEN_KEY = 'fb_token';
const USER_KEY = 'fb_user';

export interface AuthUser {
  id: number;
  email: string;
  role: 'fono' | 'responsavel';
  display_name: string;
}

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  save(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; form?: FormData } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 401) auth.clear();
    throw new ApiError(data?.error ?? `Erro ${res.status}`, res.status);
  }
  return data as T;
}