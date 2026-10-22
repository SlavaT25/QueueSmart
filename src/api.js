const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('queuesmart.user') || 'null'); } catch { return null; }
}
export function setCurrentUser(user) { localStorage.setItem('queuesmart.user', JSON.stringify(user)); }
export async function api(path, options = {}) {
  const user = getCurrentUser();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(user?.id ? { 'X-User-Id': user.id } : {}), ...options.headers },
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}
export const query = (params) => new URLSearchParams(params).toString();
