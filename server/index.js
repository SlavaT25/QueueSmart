import http from 'node:http';
import process from 'node:process';
import { connectDatabase } from './database.js';
import { store } from './store.js';

const PORT = Number(process.env.PORT) || 3001;
const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(Object.assign(new Error('Request body must contain valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

async function requireAdmin(req) {
  if (await store.getUserRole(req.headers['x-user-id']) !== 'Administrator') {
    throw Object.assign(new Error('Administrator access required.'), { status: 403 });
  }
}

export const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ok' });
    if (req.method === 'POST' && url.pathname === '/api/auth/register') return json(res, 201, { user: await store.register(await readBody(req)) });
    if (req.method === 'POST' && url.pathname === '/api/auth/login') return json(res, 200, { user: await store.login(await readBody(req)) });
    if (req.method === 'GET' && url.pathname === '/api/services') return json(res, 200, { services: await store.listServices() });
    if (req.method === 'POST' && url.pathname === '/api/services') {
      await requireAdmin(req);
      return json(res, 201, { service: await store.saveService(await readBody(req)) });
    }
    if (req.method === 'PUT' && parts[0] === 'api' && parts[1] === 'services' && parts.length === 3) {
      await requireAdmin(req);
      return json(res, 200, { service: await store.saveService(await readBody(req), parts[2]) });
    }
    if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'services' && parts[3] === 'open') {
      await requireAdmin(req);
      const body = await readBody(req);
      if (typeof body.open !== 'boolean') throw Object.assign(new Error('open must be a boolean.'), { status: 400 });
      return json(res, 200, { service: await store.setServiceOpen(parts[2], body.open) });
    }
    if (req.method === 'POST' && url.pathname === '/api/queue') return json(res, 201, { entry: await store.joinQueue(await readBody(req)) });
    if (req.method === 'GET' && url.pathname === '/api/queue') {
      await requireAdmin(req);
      return json(res, 200, { entries: await store.queue(url.searchParams.get('serviceId')) });
    }
    if (req.method === 'GET' && url.pathname === '/api/queue/mine') return json(res, 200, { entries: await store.myQueue(url.searchParams.get('userId')) });
    if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'queue' && parts.length === 3) {
      return json(res, 200, { entry: await store.leaveQueue(parts[2], url.searchParams.get('userId')) });
    }
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'queue' && parts[3] === 'serve-next') {
      await requireAdmin(req);
      return json(res, 200, { entry: await store.serveNext(parts[2]) });
    }
    if (req.method === 'GET' && url.pathname === '/api/history') return json(res, 200, { history: await store.history(url.searchParams.get('userId')) });
    if (req.method === 'GET' && url.pathname === '/api/notifications') return json(res, 200, { notifications: await store.notifications(url.searchParams.get('userId')) });
    return json(res, 404, { error: 'Endpoint not found.' });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Internal server error.' });
  }
});

async function start() {
  await connectDatabase();
  await store.seedDefaultServices();
  await store.seedAdministrator({ name: process.env.QUEUESMART_ADMIN_NAME, email: process.env.QUEUESMART_ADMIN_EMAIL, password: process.env.QUEUESMART_ADMIN_PASSWORD });
  server.listen(PORT, () => console.log(`QueueSmart API listening on http://localhost:${PORT}`));
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  start().catch((error) => {
    console.error(`Could not start QueueSmart API: ${error.message}`);
    process.exitCode = 1;
  });
}