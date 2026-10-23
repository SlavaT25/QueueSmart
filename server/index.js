import http from 'node:http';
import process from 'node:process';
import { store } from './store.js';

const PORT = Number(process.env.PORT) || 3001;
store.seedAdministrator({ name: process.env.QUEUESMART_ADMIN_NAME, email: process.env.QUEUESMART_ADMIN_EMAIL, password: process.env.QUEUESMART_ADMIN_PASSWORD });
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' }); res.end(JSON.stringify(body)); };
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; req.on('data', (chunk) => { data += chunk; if (data.length > 1_000_000) reject(Object.assign(new Error('Request body is too large.'), { status: 413 })); });
    req.on('end', () => { if (!data) return resolve({}); try { resolve(JSON.parse(data)); } catch { reject(Object.assign(new Error('Request body must contain valid JSON.'), { status: 400 })); } });
    req.on('error', reject);
  });
}
function requireAdmin(req) {
  const user = store.users.find((item) => item.id === req.headers['x-user-id']);
  if (user?.role !== 'Administrator') throw Object.assign(new Error('Administrator access required.'), { status: 403 });
}

export const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ok' });
    if (req.method === 'POST' && url.pathname === '/api/auth/register') return json(res, 201, { user: store.register(await readBody(req)) });
    if (req.method === 'POST' && url.pathname === '/api/auth/login') return json(res, 200, { user: store.login(await readBody(req)) });
    if (req.method === 'GET' && url.pathname === '/api/services') return json(res, 200, { services: store.listServices() });
    if (req.method === 'POST' && url.pathname === '/api/services') { requireAdmin(req); return json(res, 201, { service: store.saveService(await readBody(req)) }); }
    if (req.method === 'PUT' && parts[0] === 'api' && parts[1] === 'services' && parts.length === 3) { requireAdmin(req); return json(res, 200, { service: store.saveService(await readBody(req), parts[2]) }); }
    if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'services' && parts[3] === 'open') { requireAdmin(req); const body = await readBody(req); if (typeof body.open !== 'boolean') throw Object.assign(new Error('open must be a boolean.'), { status: 400 }); return json(res, 200, { service: store.setServiceOpen(parts[2], body.open) }); }
    if (req.method === 'POST' && url.pathname === '/api/queue') return json(res, 201, { entry: store.joinQueue(await readBody(req)) });
    if (req.method === 'GET' && url.pathname === '/api/queue') { requireAdmin(req); return json(res, 200, { entries: store.queue(url.searchParams.get('serviceId')) }); }
    if (req.method === 'GET' && url.pathname === '/api/queue/mine') return json(res, 200, { entries: store.myQueue(url.searchParams.get('userId')) });
    if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'queue' && parts.length === 3) return json(res, 200, { entry: store.leaveQueue(parts[2], url.searchParams.get('userId')) });
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'queue' && parts[3] === 'serve-next') { requireAdmin(req); return json(res, 200, { entry: store.serveNext(parts[2]) }); }
    if (req.method === 'GET' && url.pathname === '/api/history') return json(res, 200, { history: store.history(url.searchParams.get('userId')) });
    if (req.method === 'GET' && url.pathname === '/api/notifications') return json(res, 200, { notifications: store.notifications(url.searchParams.get('userId')) });
    return json(res, 404, { error: 'Endpoint not found.' });
  } catch (error) { return json(res, error.status || 500, { error: error.message || 'Internal server error.' }); }
});

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) server.listen(PORT, () => console.log(`QueueSmart API listening on http://localhost:${PORT}`));

