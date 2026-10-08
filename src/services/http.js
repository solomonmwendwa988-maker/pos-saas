import { env } from '@/utils/env';

/**
 * Minimal fetch wrapper. Uses HttpOnly cookies for auth by default.
 * Credentials are NEVER stored in localStorage.
 */
async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const url = `${env.apiUrl}${path}`;
  const opts = {
    method,
    credentials: 'include', // send HttpOnly session cookie
    headers: { 'Content-Type': 'application/json', ...headers },
    signal,
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return text; }
}

export const http = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};